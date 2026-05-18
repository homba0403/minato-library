const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_SECRET });

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const response = await notion.databases.query({
      database_id: process.env.BOOK_DB_ID,
      sorts: [{ property: "書名", direction: "ascending" }],
    });

    const books = response.results.map((page) => ({
      id: page.id,
      title: page.properties["書名"]?.title[0]?.plain_text ?? "",
      author: page.properties["著者"]?.rich_text[0]?.plain_text ?? "",
      category: page.properties["カテゴリ"]?.select?.name ?? "",
      status: page.properties["ステータス"]?.select?.name ?? "不明",
      borrower: page.properties["現在の借り手"]?.rich_text[0]?.plain_text ?? "",
      comment: page.properties["太郎のひとこと"]?.rich_text[0]?.plain_text ?? "",
      avgRating: page.properties["平均評価"]?.rollup?.number ?? null,
      // 表紙画像：Notionにアップした画像、またはExternalリンクどちらにも対応
      cover:
        page.properties["表紙画像"]?.files[0]?.file?.url ??
        page.properties["表紙画像"]?.files[0]?.external?.url ??
        null,
    }));

    res.status(200).json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
