import { Duration } from 'aws-cdk-lib';
import { ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Function, Runtime, Code, FunctionUrlAuthType } from 'aws-cdk-lib/aws-lambda';
import { Construct } from "constructs"
import { join } from "path";

const { deploymentType = "", region = "" } = process.env;

export const createLambda = (stack: Construct) => {
    const fargateFactorioLambdaRoleName = "factorio-ec2-server-ecs-task-role"
    const fargateFactorioLambdaRole = new Role(stack, "factorio-ec2-server-ecs-task-role", {
        assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
        roleName: `${deploymentType}-${fargateFactorioLambdaRoleName}`,
    });

    fargateFactorioLambdaRole.addToPolicy(new PolicyStatement({
        actions: [
            'ecs:ListClusters',
            'ecs:ListTasks',
            'ecs:ListServices',
            'ecs:DescribeServices',
            "ecs:DescribeTasks",
            "ec2:DescribeNetworkInterfaces",
        ],
        resources: ['*'],
    }));

    const lambdaName = `${deploymentType}-getFactorioServerIP`

    const myLambdaFunction = new Function(stack, lambdaName, {
        runtime: Runtime.NODEJS_20_X,
        functionName:lambdaName,
        code: Code.fromAsset(join(__dirname, './src')),
        handler: 'index.handler',
        timeout: Duration.seconds(30),
        memorySize: 128,
        role: fargateFactorioLambdaRole,
        environment:{
            region,
            deploymentType,
        }
    });

    myLambdaFunction.addFunctionUrl({
        authType: FunctionUrlAuthType.NONE,
    });
}