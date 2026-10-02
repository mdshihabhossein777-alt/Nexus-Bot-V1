module.exports = {
  name: "groupname", aliases: ["setname", "gname"], version: "1.0.0", role: 1,
  description: "Change the group name",
  usage: "/groupname New Name",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      if (!event.isGroup) return api.sendMessage("⚠️ Groups only.", threadID);
      const name = args.join(" ").trim();
      if (!name) return api.sendMessage("📝 Usage: /groupname New Group Name", threadID);
      if (name.length > 100) return api.sendMessage("⚠️ Name is too long (max 100 chars).", threadID);
      await api.setTitle(name, threadID);
      const g = await db.getGroup(threadID);
      g.name = name;
      await g.save();
      db.cache.set(`group_${threadID}`, g, 30);
      api.sendMessage(`✅ Group name changed to: ${name}`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};