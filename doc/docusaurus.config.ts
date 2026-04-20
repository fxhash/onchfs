import { themes as prismThemes } from "prism-react-renderer"
import type { Config } from "@docusaurus/types"
import type * as Preset from "@docusaurus/preset-classic"

const config: Config = {
  title: "ONCHFS — On-Chain for Http File System",
  tagline: "A file system for blockchains.",
  favicon: "img/favicon.ico",

  // Set the production url of your site here
  url: "https://onchfs.com",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "fxhash",
  projectName: "onchfs",

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  markdown: {
    mermaid: true,
  },
  themes: ["@docusaurus/theme-mermaid"],

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            "https://github.com/fxhash/onchfs/tree/main/doc/templates/shared/",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: "img/social-card.png",
    navbar: {
      title: "ONCHFS",
      items: [
        {
          type: "docSidebar",
          sidebarId: "getting-started",
          position: "left",
          label: "Getting started",
        },
        {
          type: "docSidebar",
          sidebarId: "concepts",
          position: "left",
          label: "Concepts",
        },
        {
          type: "docSidebar",
          sidebarId: "libraries",
          position: "left",
          label: "Libraries",
        },
        {
          href: "https://github.com/fxhash/onchfs",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            {
              label: "Getting started",
              to: "/docs/intro",
            },
            {
              label: "Concepts",
              to: "/docs/concepts/hashing",
            },
            {
              label: "Libraries",
              to: "/docs/libraries/overview",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "Stack Overflow",
              href: "https://stackoverflow.com/questions/tagged/docusaurus",
            },
            {
              label: "Discord",
              href: "https://discordapp.com/invite/docusaurus",
            },
            {
              label: "Twitter",
              href: "https://twitter.com/docusaurus",
            },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/fxhash/onchfs",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} fxhash. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.dracula,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["solidity", "abnf"],
    },
  } satisfies Preset.ThemeConfig,
}

export default config
