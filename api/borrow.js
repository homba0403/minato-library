const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_SECRET });

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { bookId, borrowerName } = req.body;
  const today = new Date().toISOString().split("T")[0];

  try {
    // 貸出履歴DBに新規レコード追加
    await notion.pages.create({
      parent: { database_id: process.env.LENDING_DB_ID },
      properties: {
        // 貸出履歴DBのタイトルプロパティ名に合わせてください
        "名前": {
          title: [{ text: { content: `${borrowerName}（${today}）` } }],
        },
        "書名": { relation: [{ id: bookId }] },
        "借り手名": { rich_text: [{ text: { content: borrowerName } }] },
        "貸出日": { date: { start: today } },
        "ステータス": { select: { name: "貸出中" } },
      },
    });

    // 本棚DBのステータスを「貸出中」に更新
    await notion.pages.update({
      page_id: bookId,
      properties: {
        "ステータス": { select: { name: "貸出中" } },
        "現在の借り手": { rich_text: [{ text: { content: borrowerName } }] },
        "貸出開始日": { date: { start: today } },
      },
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
