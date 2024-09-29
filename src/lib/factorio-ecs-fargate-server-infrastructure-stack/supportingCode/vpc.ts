import { FlowLog, FlowLogDestination, FlowLogResourceType, FlowLogTrafficType, IpAddresses, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { LogGroup, LogStream, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { addVPC } from "../../resources/vpc";
import { ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { RemovalPolicy } from "aws-cdk-lib";

export function createVPC(stack:Construct) {
  const vpcName = "factorio-ecs-fargate-server-vpc";
  const vpc = new Vpc(stack, "Vpc", {
    vpcName,
    ipAddresses:IpAddresses.cidr("10.30.15.0/24"),
    createInternetGateway:true,
    maxAzs: 1,
    subnetConfiguration: [
      {
        name: "Public",
        subnetType: SubnetType.PUBLIC,
        cidrMask: 28,
      },
    ],

  });

  const vpcRole = new Role(stack, "RoleVpcFlowLogs", {
    assumedBy: new ServicePrincipal("vpc-flow-logs.amazonaws.com"),
    managedPolicies: [
      ManagedPolicy.fromAwsManagedPolicyName("CloudWatchFullAccess"),
    ],
  });

  const logGroup = new LogGroup(stack, "VpcFlowLogGroup", {
    retention: RetentionDays.ONE_MONTH,
    removalPolicy: RemovalPolicy.DESTROY,
  });

  const logStream = new LogStream(stack, "VpcFlowLogStream", {
    logGroup: logGroup,
    removalPolicy: RemovalPolicy.DESTROY,
  });

  const flowLogs = new FlowLog(stack, "VpcFlowLog", {
    resourceType: FlowLogResourceType.fromVpc(vpc),
    destination: FlowLogDestination.toCloudWatchLogs(logGroup, vpcRole),
    trafficType: FlowLogTrafficType.ALL,
  });

  addVPC(vpcName, vpc);
  return vpc;
}