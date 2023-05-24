module.exports = {
  sleep_ms: 30000,
  tombstone: {
    fileName: "ts.json"
  },
  log: { level: "log" },  // log levels are log - trace - debug - info - warn - error
  tenant: {
    ui: "https://<tenant-id>",
    id: "<client-id>",
    secret: "<client-secret>",
  },
  elk: {
    es: "<link-to-elasticsearch>",
    kibana: "<link-to-kibana>",
  },
  event_types: []  // e.g. ["threat", "sso", ...]
};
