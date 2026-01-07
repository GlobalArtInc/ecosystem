import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import { themes as prismThemes } from "prism-react-renderer";

const config: Config = {
  title: "GlobalArt Ecosystem",
  tagline: "Comprehensive bundles for development",
  favicon: "img/favicon.svg",

  url: "https://globalart.js.org",
  baseUrl: "/",

  organizationName: "GlobalArtInc",
  projectName: "globalart-ecosystem",

  onBrokenLinks: "throw",

  // todo...
  // i18n: {
  //   defaultLocale: 'en',
  //   locales: ['en'],
  // },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          editUrl: "https://github.com/GlobalArtInc/ecosystem/tree/main/docs",
          path: "content",
          routeBasePath: "/",
          showLastUpdateAuthor: false,
          showLastUpdateTime: false,
          // remarkPlugins: [
          //   ['@docusaurus/remark-plugin-npm2yarn', { sync: true }]
          // ],
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: "img/social-card.jpg",
    metadata: [
      {
        name: "keywords",
        content: "nestjs, typescript, swagger, pagination, microservices, ddd",
      },
      {
        name: "description",
        content:
          "Professional NestJS ecosystem with utilities for Swagger documentation, pagination, microservices, and DDD patterns",
      },
    ],
    colorMode: {
      defaultMode: "dark",
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: "GlobalArt Ecosystem",
      logo: {
        alt: "GlobalArt Ecosystem Logo",
        src: "img/logo.svg",
        srcDark: "img/logo-dark.svg",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "tutorialSidebar",
          position: "left",
          label: "Documentation",
        },
        {
          type: "dropdown",
          label: "Packages",
          position: "left",
          items: [
            {
              label: "Swagger Documentation",
              to: "/packages/nestjs-swagger",
            },
            {
              label: "TypeORM Pagination",
              to: "/packages/nestjs-typeorm-pagination",
            },
            {
              label: "Microservices",
              to: "/packages/nestjs-microservices",
            },
            {
              label: "Logger",
              to: "/packages/nestjs-logger",
            },
            {
              label: "DDD Toolkit",
              to: "/packages/ddd",
            },
          ],
        },
        {
          href: "https://github.com/GlobalArtInc/ecosystem",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Documentation",
          items: [
            {
              label: "Getting Started",
              to: "/intro",
            },
            {
              label: "Packages",
              to: "/packages",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "Discord",
              href: "https://discord.com/invite/4Tc9hssSAv",
            },
            {
              label: "GitHub Discussions",
              href: "https://github.com/GlobalArtInc/ecosystem/discussions",
            },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/GlobalArtInc/ecosystem",
            },
            {
              label: "NPM Organization",
              href: "https://www.npmjs.com/org/globalart",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} GlobalArt, Inc.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["bash", "json", "typescript"],
    },
    algolia: {
      appId: "YOUR_APP_ID",
      apiKey: "YOUR_SEARCH_API_KEY",
      indexName: "globalart-ecosystem",
      contextualSearch: true,
      searchPagePath: "search",
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
