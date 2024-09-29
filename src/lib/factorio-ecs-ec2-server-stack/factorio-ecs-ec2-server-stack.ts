import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { createEC2ECS } from "./supportingCode/ecsEc2";


export class FactorioEcsEC2ServerStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    createEC2ECS(this);
  }
}