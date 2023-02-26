module.exports = {
    tenant: {
      ui: 'https://<your-tenant>',
      id: '<client-id>',
      secret: '<client-secret>',
    },
    log: { level: "log" },
    elk: {
        es: '<link-to-your-elasticsearch>',                     
        kibana: '<link-to-your-kiabana>',                     
        eventTypes: {}                                   
    },
    tombstone: {
        fileName: '<json-tombstone-file-location>'
    },
};
// log levels are log - trace - debug - info - warn - error