import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { createVPC } from './supportingCode/vpc';


export class FactorioEcsEc2ServerInfrastructureStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    createVPC(this);
  }
}