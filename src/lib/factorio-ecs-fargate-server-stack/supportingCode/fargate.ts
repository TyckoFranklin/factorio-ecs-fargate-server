import { RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import { ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Cluster, Compatibility, ContainerImage, FargateService, LogDriver, NetworkMode, TaskDefinition } from "aws-cdk-lib/aws-ecs";
import { Peer, Port, SecurityGroup, Vpc } from "aws-cdk-lib/aws-ec2";
import { Protocol } from "aws-cdk-lib/aws-ecs";
import { LifecyclePolicy, PerformanceMode, ThroughputMode, FileSystem, AccessPoint, } from "aws-cdk-lib/aws-efs";
import { LogGroup } from "aws-cdk-lib/aws-logs";

export function createFargate(stack: Construct) {

  const { deploymentType } = process.env;

  const logGroup = new LogGroup(stack, "factorio-server-log-group", {
    logGroupName:`/ecs/${deploymentType}-Factorio-Server`,
    removalPolicy:RemovalPolicy.DESTROY,
  })

  const vpc = Vpc.fromLookup(stack, "vpc", {
    vpcName:"factorio-ecs-fargate-server-vpc",
  });

  const fargateFactorioServerRoleName =  "Factorio-server-ecs-task-role"
  const fargateFactorioServerRole = new Role(stack, "Factorio-server-ecs-task-role", {
    assumedBy: new ServicePrincipal("ecs-tasks.amazonaws.com"),
    managedPolicies: [
      ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AmazonECSTaskExecutionRolePolicy"
      ),
    ],
    roleName:`${deploymentType}-${fargateFactorioServerRoleName}`,
  });

  const efsSecurityGroupName = "factorio-server-efs-security-group"
  const efsSG = new SecurityGroup(stack, efsSecurityGroupName, {
    vpc,
    allowAllOutbound: true,
    securityGroupName: `${deploymentType}-${efsSecurityGroupName}`,
  });

  const ec2EFSMaintenanceSecurityGroupName = "factorio-server-efs-ec2-maintenance-security-group"
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
  const factorioDataEFS = new FileSystem(stack, "factorio-server-efs", {
    vpc,
    lifecyclePolicy: LifecyclePolicy.AFTER_14_DAYS,
    performanceMode: PerformanceMode.GENERAL_PURPOSE,
    throughputMode: ThroughputMode.BURSTING,
    removalPolicy: RemovalPolicy.DESTROY,
    securityGroup:efsSG,
    fileSystemName:`${deploymentType}-factorio-server-efs`,
    allowAnonymousAccess:true,
  });

  const factorioDataEFSAccessPoint = new AccessPoint(stack, "factorio-server-efs-access-point",  {
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
   * | CPU Value | Memory Value                                    | Operating Systems Supported for AWS Fargate |
   * |-----------|-------------------------------------------------|---------------------------------------------|
   * | 256       | 512 MiB, 1 GB, 2 GB                             | Linux                                       |
   * | 512       | 1 GB, 2 GB, 3 GB, 4 GB                          | Linux                                       |
   * | 1024      | 2 GB, 3 GB, 4 GB, 5 GB, 6 GB, 7 GB, 8 GB        | Linux, Windows                              |
   * | 2048      | Between 4 GB and 16 GB in 1 GB increments       | Linux, Windows                              |
   * | 4096      | Between 8 GB and 30 GB in 1 GB increments       | Linux, Windows                              |
   * | 8192      | Between 16 GB and 60 GB in 4 GB increments      | Linux                                       |
   * | 16384     | Between 32 GB and 120 GB in 8 GB increments     | Linux                                       |
   */

  const taskVolumeName = `${deploymentType}-factorio-server-task-volume`;
  const taskDefinition = new TaskDefinition(stack, "factorio-task-definition", {
    compatibility: Compatibility.FARGATE,
    cpu: "2048",
    memoryMiB: "4096",
    networkMode: NetworkMode.AWS_VPC,
    taskRole: fargateFactorioServerRole,
    volumes:[
      {
        name: taskVolumeName,
        efsVolumeConfiguration: {
          rootDirectory:"/",
          fileSystemId: factorioDataEFS.fileSystemId,
        },
      }
    ],
  });

  const container = taskDefinition.addContainer("factorio-container", {
    containerName:`${deploymentType}-factorio-server-container`,
    image: ContainerImage.fromRegistry("factoriotools/factorio:stable"),
    logging: LogDriver.awsLogs({
      streamPrefix: "factorio-server-logs",
      logGroup: logGroup,
    }),
  });

  container.addPortMappings({name:"factorio-udp-mapping", containerPort: 34197, protocol:Protocol.UDP, hostPort:34197 });
  container.addPortMappings({name:"factorio-tcp-mapping", containerPort: 27015, protocol:Protocol.TCP, hostPort:27015 });

  container.addMountPoints({
    containerPath: '/factorio',
    sourceVolume: taskVolumeName,
    readOnly: false,
  });


  const ecsSG = new SecurityGroup(stack, "factorio-ecs-security-group", {
    vpc,
    allowAllOutbound: true,
    securityGroupName:`${deploymentType}-factorio-server-ecs-security-group`
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

  const cluster = new Cluster(stack, "factorio-server-cluster", {
    vpc,
    containerInsights: true,
    clusterName:`${deploymentType}-factorio-server-cluster`,
    enableFargateCapacityProviders: true,
  });

  const service = new FargateService(stack, "factorio-server-service", {
    serviceName:`${deploymentType}-factorio-server-ecs-service`,
    cluster,
    taskDefinition,
    desiredCount: 1,
    securityGroups: [ecsSG],
    minHealthyPercent: 0,
    maxHealthyPercent: 100,
    assignPublicIp: true,
    enableExecuteCommand: true,
    capacityProviderStrategies: [
      {
        capacityProvider: 'FARGATE_SPOT',
        weight: 1,
      },
    ],
  });
}