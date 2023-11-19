#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { FactorioEcsFargateServerStack } from '../lib/factorio-ecs-fargate-server-stack';

const app = new cdk.App();
new FactorioEcsFargateServerStack(app, 'FactorioEcsFargateServerStack');
