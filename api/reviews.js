const { Client } = require("@notionhq/client");
const notion = new Client({ auth: process.env.NOTION_SECRET });

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { bookId } = req.query;
  if (!bookId) return res.status(400).json({ error: "bookId required" });

  try {
    const response = await notion.databases.query({
      database_id: process.env.REVIEW_DB_ID,
      filter: { property: "書名", relation: { contains: bookId } },
      sorts: [{ timestamp: "created_time", direction: "descending" }],
    });

    const reviews = response.results.map((page) => ({
      reviewerName: page.properties["レビュアー名"]?.rich_text[0]?.plain_text ?? "",
      comment:      page.properties["感想"]?.rich_text[0]?.plain_text ?? "",
    })).filter(r => r.comment);

    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
