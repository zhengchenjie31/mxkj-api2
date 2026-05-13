// 卡密库：key → 有效天数
const CARD_DB = {
  "MX2026K001": 30,
  "MX2026K002": 30,
  "MX2026V001": 90,
  "MX2026Y001": 365
};

// 内存存储（重启会清空，适合个人用；长期稳定可换数据库）
const DEVICE_BIND = new Map();
const USER_AUTH = new Map();

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ code: -1, msg: "方法不允许" });

  const { key, device } = req.body || {};
  if (!key || !device) return res.json({ code: -1, msg: "参数错误" });

  // 自动登录检查（已激活过的设备）
  if (key.startsWith("AUTO_CHECK_")) {
    const auth = USER_AUTH.get(device);
    if (!auth) return res.json({ code: -1, msg: "需要激活" });
    if (auth.expire < Date.now()) {
      USER_AUTH.delete(device);
      DEVICE_BIND.delete(auth.key);
      return res.json({ code: -1, msg: "卡密已过期" });
    }
    return res.json({ code: 0, msg: "已授权" });
  }

  // 卡密有效性检查
  const days = CARD_DB[key];
  if (!days) return res.json({ code: -1, msg: "卡密无效" });

  // 一机一码绑定
  const bindDevice = DEVICE_BIND.get(key);
  if (bindDevice && bindDevice !== device) {
    return res.json({ code: -1, msg: "该卡密已绑定其他设备" });
  }

  // 计算有效期
  const expire = Date.now() + days * 86400 * 1000;
  DEVICE_BIND.set(key, device);
  USER_AUTH.set(device, { key, expire });

  return res.json({
    code: 0,
    msg: "激活成功",
    expire: new Date(expire).toLocaleString()
  });
}