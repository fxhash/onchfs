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
  concepts: [
    {
      type: "doc",
      label: "Getting started",
      id: "getting-started",
    },
    {
      type: "doc",
      label: "Overview",
      id: "overview",
    },
    {
      type: "category",
      label: "Concepts",
      collapsed: false,
      link: {
        type: "generated-index",
        title: "Concepts",
        description: "A quick overview on the various concepts of ONCHFS",
      },
      items: [
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
          label: "CIDs",
          id: "concepts/cids",
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
      type: "category",
      label: "Limitations",
      items: [
        {
          type: "doc",
          label: "Content availability",
          id: "limitations/content-availability",
        },
        {
          type: "doc",
          label: "Ecosystem integration",
          id: "limitations/ecosystem-integration",
        },
      ],
    },
    {
      type: "doc",
      label: "Motivations",
      id: "motivations",
    },
  ],
}

module.exports = sidebars
