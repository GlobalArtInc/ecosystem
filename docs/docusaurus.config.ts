import type * as Preset from '@docusaurus/preset-classic';
import type { Config } from '@docusaurus/types';
import { themes as prismThemes } from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
const isPreview = process.env.NODE_ENV === 'preview';

const config: Config = {
  title: 'NestJS Toolkit',
  favicon: 'img/favicon.ico',
  

  url: 'https://nestjs-toolkit.js.org',
  baseUrl: '/',

  organizationName: 'GlobalArtInc',
  projectName: 'nestjs-toolkit', 

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  trailingSlash: isPreview,

  presets: [
    [
      'classic',
      {
        debug: isDev,
        docs: {
					sidebarPath: require.resolve('./sidebars.js'),
					editUrl: 'https://github.com/GlobalArtInc/nestjs-toolkit/tree/main/docs',
					path: 'content',
					routeBasePath: '/',
					showLastUpdateAuthor: false,
					showLastUpdateTime: false,
					remarkPlugins: [[require('@docusaurus/remark-plugin-npm2yarn'), { sync: true }]]
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: true,
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'NestJS Toolkit',
      logo: {
        alt: 'NestJS Toolkit',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Introduction',
        },
        {
          href: 'https://github.com/GlobalArtInc/nestjs-toolkit',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Introduction',
              to: '/intro',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Discord',
              href: 'https://discord.com/invite/4Tc9hssSAv',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/GlobalArtInc',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} GlobalArt, Inc. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
