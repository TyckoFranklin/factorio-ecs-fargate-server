#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';

import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { FactorioEcsFargateServerStack } from '../src/lib/factorio-ecs-fargate-server-stack/factorio-ecs-fargate-server-stack';
import { FactorioEcsFargateServerInfrastructureStack } from '../src/lib/factorio-ecs-fargate-server-infrastructure-stack/factorio-ecs-fargate-server-infrastructure-stack';

const { deploymentType, applicationName, applicationAbreviation, } = process.env;
const env = {
        region: process.env.region,
        account: process.env.account,
};

const app = new cdk.App();

new FactorioEcsFargateServerInfrastructureStack(app, `${applicationName}-shared-FactorioEcsFargateServerInfrastructureStack`);
new FactorioEcsFargateServerStack(app, `${applicationName}-${deploymentType}-FactorioEcsFargateServerStack`);
