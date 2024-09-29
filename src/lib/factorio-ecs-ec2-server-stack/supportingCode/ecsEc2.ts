import { RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import { ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Cluster, Compatibility, ContainerImage, FargateService, Ec2Service, LogDriver, NetworkMode, TaskDefinition, } from "aws-cdk-lib/aws-ecs";
import { InstanceClass, InstanceSize, InstanceType, KeyPair, Peer, Port, SecurityGroup, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { Protocol } from "aws-cdk-lib/aws-ecs";
import { LifecyclePolicy, PerformanceMode, ThroughputMode, FileSystem, AccessPoint, } from "aws-cdk-lib/aws-efs";
import { LogGroup } from "aws-cdk-lib/aws-logs";
import { ApplicationLoadBalancer, ApplicationProtocol, NetworkLoadBalancer, Protocol as NetworkProtocol } from "aws-cdk-lib/aws-elasticloadbalancingv2";

export function createEC2ECS(stack: Construct) {

  const { deploymentType } = process.env;

  const logGroup = new LogGroup(stack, "factorio-ec2-server-log-group", {
    logGroupName: `/ecs/${deploymentType}-Factorio-EC2-Server`,
    removalPolicy: RemovalPolicy.DESTROY,
  })

  const vpc = Vpc.fromLookup(stack, "vpc", {
    vpcName: "factorio-ecs-ec2-server-vpc",
  });

  const fargateFactorioServerRoleName = "factorio-ec2-server-ecs-task-role"
  const fargateFactorioServerRole = new Role(stack, "factorio-ec2-server-ecs-task-role", {
    assumedBy: new ServicePrincipal("ecs-tasks.amazonaws.com"),
    managedPolicies: [
      ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AmazonECSTaskExecutionRolePolicy"
      ),
    ],
    roleName: `${deploymentType}-${fargateFactorioServerRoleName}`,
  });

  const efsSecurityGroupName = "factorio-ec2-server-efs-security-group"
  const efsSG = new SecurityGroup(stack, efsSecurityGroupName, {
    vpc,
    allowAllOutbound: true,
    securityGroupName: `${deploymentType}-${efsSecurityGroupName}`,
  });

  const ec2EFSMaintenanceSecurityGroupName = "factorio-ec2-server-efs-maintenance-security-group"
  const ec2EFSMaintenanceSecurityGroup = new SecurityGroup(stack, ec2EFSMaintenanceSecurityGroupName, {
    vpc,
    allowAllOutbound: true,
    securityGroupName: `${deploymentType}-${ec2EFSMaintenanceSecurityGroupName}`,
  });
  // EFS connection from EC2 for managing the data
  efsSG.addIngressRule(
    Peer.securityGroupId(ec2EFSMaintenanceSecurityGroup.securityGroupId),
    Port.allTcp(),
    "Allow EC2 access for managing data",
  );

  // Create the file system
  const factorioDataEFS = new FileSystem(stack, "factorio-ec2-server-efs", {
    vpc,
    lifecyclePolicy: LifecyclePolicy.AFTER_14_DAYS,
    performanceMode: PerformanceMode.GENERAL_PURPOSE,
    throughputMode: ThroughputMode.BURSTING,
    removalPolicy: RemovalPolicy.DESTROY,
    securityGroup: efsSG,
    fileSystemName: `${deploymentType}-factorio-ec2-server-efs`,
    allowAnonymousAccess: true,
  });

  const factorioDataEFSAccessPoint = new AccessPoint(stack, "factorio-ec2-server-efs-access-point", {
    fileSystem: factorioDataEFS,
    path: "/",
    createAcl: {
      ownerGid: "1000",
      ownerUid: "1000",
      permissions: "777"
    },
    posixUser: {
      uid: "1000",
      gid: "1000",
    }
  })

  /**
   * +-------------+-------+--------+
   * |   Instance  | vCPU* | Mem    |
   * |             |       | (GiB)  |
   * +-------------+-------+--------+
   * | t3a.nano    | 2     | 0.5    |
   * | t3a.micro   | 2     | 1      |
   * | t3a.small   | 2     | 2      |
   * | t3a.medium  | 2     | 4      |
   * | t3a.large   | 2     | 8      |
   * | t3a.xlarge  | 4     | 16     |
   * | t3a.2xlarge | 8     | 32     |
   * +-------------+-------+--------+
   *
   */



  const taskVolumeName = `${deploymentType}-factorio-ec2-server-task-volume`;
  const taskDefinition = new TaskDefinition(stack, "factorio-task-definition", {
    compatibility: Compatibility.EC2,
    networkMode: NetworkMode.AWS_VPC,
    taskRole: fargateFactorioServerRole,
    volumes: [
      {
        name: taskVolumeName,
        efsVolumeConfiguration: {
          rootDirectory: "/",
          fileSystemId: factorioDataEFS.fileSystemId,
        },
      }
    ],
  });

  const container = taskDefinition.addContainer("factorio-container", {
    containerName: `${deploymentType}-factorio-ec2-server-container`,
    image: ContainerImage.fromRegistry("factoriotools/factorio:stable"),
    logging: LogDriver.awsLogs({
      streamPrefix: "factorio-ec2-server-logs",
      logGroup: logGroup,
    }),
    memoryLimitMiB: 8192,
    memoryReservationMiB: 1024,
    // portMappings:[
    //   { name: "factorio-udp-mapping", containerPort: 34197, protocol: Protocol.UDP, hostPort: 34197 },
    //   { name: "factorio-tcp-mapping", containerPort: 27015, protocol: Protocol.TCP, hostPort: 27015 },
    // ]
  });

  container.addPortMappings({ name: "factorio-tcp-outgoing-mapping", containerPort: 443, protocol: Protocol.TCP, hostPort: 443 });
  container.addPortMappings({ name: "factorio-udp-mapping", containerPort: 34197, protocol: Protocol.UDP, hostPort: 34197 });
  container.addPortMappings({ name: "factorio-tcp-mapping", containerPort: 27015, protocol: Protocol.TCP, hostPort: 27015 });

  container.addMountPoints({
    containerPath: '/factorio',
    sourceVolume: taskVolumeName,
    readOnly: false,
  });


  const ecsSG = new SecurityGroup(stack, "factorio-ecs-ec2-security-group", {
    vpc,
    allowAllOutbound: true,
    securityGroupName: `${deploymentType}-factorio-ec2-server-ecs-security-group`
  });

  // EFS connection from ecs task
  efsSG.addIngressRule(
    Peer.securityGroupId(ecsSG.securityGroupId),
    Port.allTcp(),
    "allow ECS access",
  );

  ecsSG.addIngressRule(
    Peer.anyIpv4(),
    Port.tcp(27015),
    "IP range for TCP for Factorio"
  );

  ecsSG.addIngressRule(
    Peer.anyIpv4(),
    Port.udp(34197),
    "IP range for UDP for Factorio"
  );

  ecsSG.addIngressRule(
    Peer.ipv4("68.185.42.130/32"),
    Port.tcp(22),
    "SSH from anywhere"
  );

  const cluster = new Cluster(stack, "factorio-ec2-server-cluster", {
    vpc,
    containerInsights: true,
    clusterName: `${deploymentType}-factorio-ec2-server-cluster`,
    capacity: {
      allowAllOutbound:true,
      // autoScalingGroupName:"factorio-ec2-autoscaling-group-1",
      instanceType: InstanceType.of(InstanceClass.T3A, InstanceSize.SMALL),
      maxCapacity:1,
      minCapacity:0,
      desiredCapacity:1,
      keyPair:KeyPair.fromKeyPairName(stack, `${deploymentType}-factorio-ec2-server-key-pair`, "factorio_23_08_12"),
    },
  });

  const service = new Ec2Service(stack, "factorio-ec2-server-service", {
    serviceName: `${deploymentType}-factorio-ec2-server-ecs-service`,
    cluster,
    taskDefinition,
    desiredCount: 1,
    securityGroups: [ecsSG],
    minHealthyPercent: 0,
    maxHealthyPercent: 100,
    enableExecuteCommand:true,
    // assignPublicIp:true,
    vpcSubnets:{
      subnets:vpc.publicSubnets,
    },
  });

  const loadBalancer = new NetworkLoadBalancer(stack, "factorio-ec2-server-load-balancer", {
    vpc,
    internetFacing: true,
    vpcSubnets: { subnetType: SubnetType.PUBLIC },
    loadBalancerName:"factorio-ec2",
  });

  // loadBalancer.loadBalancerSecurityGroups.push(ecsSG);

  const loadBalancerListenerTCP = loadBalancer.addListener("factorio-ec2-server-load-balancer-listener-tcp", {
    port:27015,
    protocol: NetworkProtocol.TCP,
  });
  const loadBalancerListenerUDP = loadBalancer.addListener("factorio-ec2-server-load-balancer-listener-udp", {
    port:34197,
    protocol: NetworkProtocol.UDP,
  });

  loadBalancerListenerTCP.addTargets("factorio-ec2-server-load-balancer-target-tcp",{
    port:27015,
    protocol:NetworkProtocol.TCP,
    targetGroupName: "factorio-ec2-tcp",
    targets:[
      service.loadBalancerTarget({
        containerName:container.containerName,
        containerPort:27015,
        protocol:Protocol.TCP,
      }),
    ],
  });

  loadBalancerListenerUDP.addTargets("factorio-ec2-server-load-balancer-target-udp",{
    port:34197,
    protocol: NetworkProtocol.UDP,
    targetGroupName: "factorio-ec2-udp",
    targets:[
      service.loadBalancerTarget({
        containerName:container.containerName,
        containerPort:34197,
        protocol:Protocol.UDP,
      }),
    ],
  });





  // const loadBalancer = new ApplicationLoadBalancer(stack, "factorio-ec2-server-load-balancer", {
  //   vpc,
  //   internetFacing: true,
  //   vpcSubnets: { subnetType: SubnetType.PUBLIC }
  // });

  // loadBalancer.connections.allowToAnyIpv4(Port.allTcp(), "All Out");
  // loadBalancer.connections.allowToAnyIpv4(Port.allUdp(), "All Out");

  // const listener = loadBalancer.addListener("AutomateListener", {
  //   port: 443,
  //   protocol: ApplicationProtocol.
  // })



}