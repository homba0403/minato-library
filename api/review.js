const { Client } = require("@notionhq/client");
const notion = new Client({ auth: process.env.NOTION_SECRET });

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { bookId, reviewerName, comment } = req.body;

  try {
    await notion.pages.create({
      parent: { database_id: process.env.REVIEW_DB_ID },
      properties: {
        "名前": {
          title: [{ text: { content: `${reviewerName}のレビュー` } }],
        },
        "書名":       { relation: [{ id: bookId }] },
        "レビュアー名": { rich_text: [{ text: { content: reviewerName } }] },
        "感想":       { rich_text: [{ text: { content: comment ?? "" } }] },
      },
    });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
