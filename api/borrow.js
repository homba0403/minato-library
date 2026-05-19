const { Client } = require("@notionhq/client");
const notion = new Client({ auth: process.env.NOTION_SECRET });

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { bookId, borrowerName, accessKey } = req.body;

  // アクセスキー検証
  if (!accessKey || accessKey !== process.env.ACCESS_KEY) {
    return res.status(403).json({ error: "unauthorized" });
  }

  const today = new Date().toISOString().split("T")[0];

  try {
    // 貸出履歴DBに新規レコード追加
    await notion.pages.create({
      parent: { database_id: process.env.LENDING_DB_ID },
      properties: {
        "名前": {
          title: [{ text: { content: `${borrowerName}（${today}）` } }],
        },
        "書名":     { relation: [{ id: bookId }] },
        "借り手名": { rich_text: [{ text: { content: borrowerName } }] },
        "貸出日":   { date: { start: today } },
        "貸出状況": { select: { name: "貸出中" } },
      },
    });

    // 本棚DBのステータスを更新
    await notion.pages.update({
      page_id: bookId,
      properties: {
        "貸出状況":   { select: { name: "貸出中" } },
        "現在の借り手": { rich_text: [{ text: { content: borrowerName } }] },
        "貸出開始日":   { date: { start: today } },
      },
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
