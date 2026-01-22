import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    "index",
    {
      type: "category",
      label: "Packages",
      collapsible: true,
      collapsed: false,
      items: [
        "packages/nestjs-swagger",
        "packages/nestjs-typeorm-pagination",
        "packages/nestjs-microservices",
        "packages/nestjs-logger",
        "packages/nestjs-etcd",
        "packages/nestjs-grpc",
        "packages/nestjs-temporal",
        "packages/nestjs-typeorm-outbox",
        "packages/zod-to-proto",
        "packages/passport",
        "packages/oxide",
        "packages/ddd",
      ],
    },
  ],
};

export default sidebars;
