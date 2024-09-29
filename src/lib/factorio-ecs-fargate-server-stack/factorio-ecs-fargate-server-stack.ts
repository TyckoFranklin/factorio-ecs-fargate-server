import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { createFargate } from "./supportingCode/fargate";
import { createLambda } from "./supportingCode/lambda";


export class FactorioEcsFargateServerStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    createFargate(this);
    createLambda(this);
  }
}