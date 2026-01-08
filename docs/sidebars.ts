import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Packages',
      collapsible: false,
      items: [
        'packages/index',
        'packages/nestjs-swagger',
        'packages/nestjs-typeorm-pagination',
        'packages/nestjs-microservices',
        'packages/nestjs-logger',
        'packages/nestjs-etcd',
        'packages/nestjs-grpc',
        'packages/zod-to-proto',
        'packages/passport',
        'packages/oxide',
        'packages/ddd',
      ],
    },
  ],
};

export default sidebars;
