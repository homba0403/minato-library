const { Client } = require("@notionhq/client");
const notion = new Client({ auth: process.env.NOTION_SECRET });

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { bookId, accessKey } = req.body;

  // アクセスキー検証
  if (!accessKey || accessKey !== process.env.ACCESS_KEY) {
    return res.status(403).json({ error: "unauthorized" });
  }

  const today = new Date().toISOString().split("T")[0];

  try {
    // 対象書籍の「貸出中」レコードを検索
    const records = await notion.databases.query({
      database_id: process.env.LENDING_DB_ID,
      filter: {
        and: [
          { property: "書名",       relation:  { contains: bookId } },
          { property: "貸出状況", select:    { equals: "貸出中" } },
        ],
      },
    });

    if (records.results.length === 0) {
      return res.status(400).json({ error: "no_active_lending" });
    }

    // 貸出履歴を返却済みに更新
    await notion.pages.update({
      page_id: records.results[0].id,
      properties: {
        "返却日":   { date: { start: today } },
        "貸出状況": { select: { name: "返却済" } },
      },
    });

    // 本棚DBを貸出可能に戻す
    await notion.pages.update({
      page_id: bookId,
      properties: {
        "貸出状況":   { select: { name: "貸出可能" } },
        "借り手名": { rich_text: [] },
        "貸出開始日":   { date: null },
      },
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
