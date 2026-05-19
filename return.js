const { Client } = require("@notionhq/client");
const notion = new Client({ auth: process.env.NOTION_SECRET });

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { bookId, pin } = req.body;
  const today = new Date().toISOString().split("T")[0];

  try {
    // 対象書籍の「貸出中」レコードを検索
    const records = await notion.databases.query({
      database_id: process.env.LENDING_DB_ID,
      filter: {
        and: [
          { property: "書名",     relation: { contains: bookId } },
          { property: "ステータス", select: { equals: "貸出中" } },
        ],
      },
    });

    if (records.results.length === 0) {
      return res.status(400).json({ error: "no_active_lending" });
    }

    const record = records.results[0];
    const storedPin = record.properties["返却PIN"]?.rich_text[0]?.plain_text ?? "";

    // PIN照合
    if (String(pin).trim() !== String(storedPin).trim()) {
      return res.status(400).json({ error: "pin_mismatch" });
    }

    // 貸出履歴を返却済みに更新
    await notion.pages.update({
      page_id: record.id,
      properties: {
        "返却日":   { date: { start: today } },
        "ステータス": { select: { name: "返却済" } },
      },
    });

    // 本棚DBを貸出可能に戻す
    await notion.pages.update({
      page_id: bookId,
      properties: {
        "ステータス":   { select: { name: "貸出可能" } },
        "現在の借り手": { rich_text: [] },
        "貸出開始日":   { date: null },
      },
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
