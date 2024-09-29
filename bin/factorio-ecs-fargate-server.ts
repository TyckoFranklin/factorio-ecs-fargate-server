#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';

import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { FactorioEcsFargateServerInfrastructureStack } from '../src/lib/factorio-ecs-fargate-server-infrastructure-stack/factorio-ecs-fargate-server-infrastructure-stack';
import { FactorioEcsEc2ServerInfrastructureStack } from '../src/lib/factorio-ecs-ec2-server-infrastructure-stack/factorio-ecs-ec2-server-infrastructure-stack';
import { FactorioEcsFargateServerStack } from '../src/lib/factorio-ecs-fargate-server-stack/factorio-ecs-fargate-server-stack';
import { FactorioEcsEC2ServerStack } from '../src/lib/factorio-ecs-ec2-server-stack/factorio-ecs-ec2-server-stack';

const { deploymentType, applicationName, applicationAbbreviation, } = process.env;
const env = {
    region: process.env.region,
    account: process.env.account,
};

const app = new cdk.App();

new FactorioEcsFargateServerInfrastructureStack(app, `${applicationName}-shared-FactorioEcsFargateServerInfrastructureStack`);
new FactorioEcsEc2ServerInfrastructureStack(app, `${applicationName}-shared-FactorioEcsEc2ServerInfrastructureStack`);
new FactorioEcsFargateServerStack(app, `${applicationName}-${deploymentType}-FactorioEcsFargateServerStack`,{ env });
new FactorioEcsEC2ServerStack(app, `${applicationName}-${deploymentType}-FactorioEcsEC2ServerStack`,{ env });
