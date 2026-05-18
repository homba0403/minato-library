const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_SECRET });

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { bookId } = req.body;
  const today = new Date().toISOString().split("T")[0];

  try {
    // 本棚DBを「貸出可能」に戻す
    await notion.pages.update({
      page_id: bookId,
      properties: {
        "ステータス": { select: { name: "貸出可能" } },
        "現在の借り手": { rich_text: [] },
        "貸出開始日": { date: null },
      },
    });

    // 貸出履歴DBの「貸出中」レコードを「返却済」に更新
    const records = await notion.databases.query({
      database_id: process.env.LENDING_DB_ID,
      filter: {
        and: [
          { property: "書名", relation: { contains: bookId } },
          { property: "ステータス", select: { equals: "貸出中" } },
        ],
      },
    });

    if (records.results.length > 0) {
      await notion.pages.update({
        page_id: records.results[0].id,
        properties: {
          "返却日": { date: { start: today } },
          "ステータス": { select: { name: "返却済" } },
        },
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
