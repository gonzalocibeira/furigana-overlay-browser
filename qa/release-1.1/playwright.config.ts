import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'.',testMatch:'release-audit.spec.ts',workers:1,timeout:45000,reporter:'list',outputDir:'../../test-results/release-1.1-audit'});
