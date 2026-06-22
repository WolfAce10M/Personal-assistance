import { Client } from '@notionhq/client'

let _client: Client | null = null

export function getNotion(): Client {
  if (!_client) {
    if (!process.env.NOTION_API_KEY) throw new Error('NOTION_API_KEY not set')
    _client = new Client({ auth: process.env.NOTION_API_KEY })
  }
  return _client
}

export function getParentPageId(): string {
  if (!process.env.NOTION_PARENT_PAGE_ID) throw new Error('NOTION_PARENT_PAGE_ID not set')
  return process.env.NOTION_PARENT_PAGE_ID
}

// Create a child page under the parent
export async function createPage(parentId: string, title: string, content?: string) {
  const notion = getNotion()

  type ParagraphBlock = {
    object: 'block'
    type: 'paragraph'
    paragraph: { rich_text: [{ type: 'text'; text: { content: string } }] }
  }

  const children: ParagraphBlock[] = []

  if (content) {
    const paragraphs = content.match(/[\s\S]{1,2000}/g) ?? [content]
    for (const para of paragraphs) {
      children.push({
        object: 'block',
        type: 'paragraph',
        paragraph: { rich_text: [{ type: 'text', text: { content: para } }] },
      })
    }
  }

  return notion.pages.create({
    parent: { type: 'page_id', page_id: parentId },
    properties: {
      title: { title: [{ type: 'text', text: { content: title } }] },
    },
    ...(children.length ? { children } : {}),
  })
}

// Append text blocks to an existing page
export async function appendToPage(pageId: string, content: string) {
  const notion = getNotion()
  const paragraphs = content.match(/[\s\S]{1,2000}/g) ?? [content]
  return notion.blocks.children.append({
    block_id: pageId,
    children: paragraphs.map(para => ({
      object: 'block' as const,
      type: 'paragraph' as const,
      paragraph: {
        rich_text: [{ type: 'text' as const, text: { content: para } }],
      },
    })),
  })
}

// Create a database inside a page
export async function createDatabase(
  parentId: string,
  title: string,
  properties: Record<string, object>
) {
  const notion = getNotion()
  return notion.databases.create({
    parent: { type: 'page_id', page_id: parentId },
    title: [{ type: 'text', text: { content: title } }],
    properties: {
      Name: { title: {} },
      ...properties,
    },
  })
}

// Add a row to a database
export async function addDatabaseRow(
  databaseId: string,
  properties: Record<string, unknown>
) {
  const notion = getNotion()
  return notion.pages.create({
    parent: { type: 'database_id', database_id: databaseId },
    properties: properties as Parameters<typeof notion.pages.create>[0]['properties'],
  })
}

// Query a database
export async function queryDatabase(databaseId: string, limit = 50) {
  const notion = getNotion()
  return notion.databases.query({
    database_id: databaseId,
    page_size: limit,
    sorts: [{ timestamp: 'created_time', direction: 'descending' }],
  })
}

// Get a page
export async function getPage(pageId: string) {
  const notion = getNotion()
  return notion.pages.retrieve({ page_id: pageId })
}
