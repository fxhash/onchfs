/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  "getting-started": [
    {
      type: "doc",
      label: "Getting started",
      id: "getting-started",
    },
    {
      type: "doc",
      label: "Motivations",
      id: "motivations",
    },
    {
      type: "doc",
      label: "Overview",
      id: "overview",
    },
    {
      type: "category",
      label: "Use-cases",
      items: [
        {
          type: "doc",
          label: "Generative Art",
          id: "use-cases/generative-art",
        },
        {
          type: "doc",
          label: "Cross-chain",
          id: "use-cases/cross-chain",
        },
      ],
    },
    {
      type: "doc",
      label: "Limitations",
      id: "limitations",
    },
  ],

  concepts: [
    {
      type: "doc",
      label: "Hashing",
      id: "concepts/hashing",
    },
    {
      type: "doc",
      label: "Content-Store",
      id: "concepts/content-store",
    },
    {
      type: "category",
      label: "File Objects",
      link: {
        type: "doc",
        id: "concepts/file-objects/index",
      },
      items: [
        {
          type: "doc",
          label: "File",
          id: "concepts/file-objects/file",
        },
        {
          type: "doc",
          label: "Directory",
          id: "concepts/file-objects/directory",
        },
      ],
    },
    {
      type: "doc",
      label: "URIs",
      id: "concepts/uris",
    },
    {
      type: "doc",
      label: "HTTP Proxy",
      id: "concepts/http-proxy",
    },
  ],

  libraries: [
    {
      type: "doc",
      label: "Common libraries",
      id: "libraries/overview",
    },
    {
      type: "category",
      label: "ONCHFS JS",
      link: {
        type: "doc",
        id: "libraries/onchfs-js/overview",
      },
      items: [
        {
          type: "category",
          label: "Common operations",
          collapsed: false,
          link: {
            type: "generated-index",
            title: "Common operations",
            description:
              "Examples showcasing how to implement common use-cases of ONCHFS.",
          },
          items: [
            {
              type: "doc",
              label: "Uploading a resource",
              id: "libraries/onchfs-js/common/uploading",
            },
            {
              type: "doc",
              label: "Proxy server",
              id: "libraries/onchfs-js/common/proxy-server",
            },
          ],
        },
        {
          type: "category",
          label: "Modules",
          collapsed: false,
          link: {
            type: "generated-index",
            title: "Modules",
            description: "The different modules of the library.",
          },
          items: [
            {
              type: "doc",
              label: "Files",
              id: "libraries/onchfs-js/modules/files",
            },
            {
              type: "doc",
              label: "Inscriptions",
              id: "libraries/onchfs-js/modules/inscriptions",
            },
            {
              type: "doc",
              label: "Metadata",
              id: "libraries/onchfs-js/modules/metadata",
            },
            {
              type: "doc",
              label: "Resolver",
              id: "libraries/onchfs-js/modules/resolver",
            },
            {
              type: "doc",
              label: "URI",
              id: "libraries/onchfs-js/modules/uri",
            },
          ],
        },
      ],
    },
  ],
}

module.exports = sidebars
