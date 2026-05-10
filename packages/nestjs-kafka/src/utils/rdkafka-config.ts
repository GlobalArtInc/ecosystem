/** Global rdkafka connection configuration options. */
export interface KafkaRdKafkaConfig {
  // Networking
  socketTimeoutMs?: number;
  socketKeepaliveEnable?: boolean;
  socketSendBufferBytes?: number;
  socketReceiveBufferBytes?: number;
  socketNagleDisable?: boolean;
  socketMaxFails?: number;
  socketConnectionSetupTimeoutMs?: number;
  connectionsMaxIdleMs?: number;
  brokerAddressTtl?: number;
  brokerAddressFamily?: "any" | "v4" | "v6";
  // Reconnect
  reconnectBackoffMs?: number;
  reconnectBackoffMaxMs?: number;
  reconnectBackoffJitterMs?: number;
  // Message sizing
  messageMaxBytes?: number;
  messageCopyMaxBytes?: number;
  receiveMessageMaxBytes?: number;
  maxInFlight?: number;
  // Metadata
  metadataMaxAgeMs?: number;
  topicMetadataRefreshIntervalMs?: number;
  topicMetadataRefreshSparse?: boolean;
  topicMetadataRefreshFastIntervalMs?: number;
  topicMetadataPropagationMaxMs?: number;
  metadataRecoveryStrategy?: "none" | "rebootstrap";
  // Misc
  clientRack?: string;
  allowAutoCreateTopics?: boolean;
  // Debug & Monitoring
  debug?: string;
  statisticsIntervalMs?: number;
  enableMetricsPush?: boolean;
  logLevel?: number;
  logConnectionClose?: boolean;
  // Security protocol
  securityProtocol?: "plaintext" | "ssl" | "sasl_plaintext" | "sasl_ssl";
  // SSL
  sslCaLocation?: string;
  sslCaPem?: string;
  sslCertificateLocation?: string;
  sslCertificatePem?: string;
  sslKeyLocation?: string;
  sslKeyPem?: string;
  sslKeyPassword?: string;
  sslCipherSuites?: string;
  sslCurvesList?: string;
  sslSigalgsList?: string;
  sslCrlLocation?: string;
  sslKeystoreLocation?: string;
  sslKeystorePassword?: string;
  enableSslCertificateVerification?: boolean;
  sslEndpointIdentificationAlgorithm?: "none" | "https";
  // SASL Kerberos
  saslKerberosServiceName?: string;
  saslKerberosPrincipal?: string;
  saslKerberosKinitCmd?: string;
  saslKerberosKeytab?: string;
  saslKerberosMinTimeBeforeRelogin?: number;
  // SASL OAuth
  saslOauthbearerMethod?: "default" | "oidc";
  saslOauthbearerClientId?: string;
  saslOauthbearerClientSecret?: string;
  saslOauthbearerScope?: string;
  saslOauthbearerExtensions?: string;
  saslOauthbearerTokenEndpointUrl?: string;
  saslOauthbearerGrantType?: "client_credentials" | "urn:ietf:params:oauth:grant-type:jwt-bearer";
  saslOauthbearerSubClaimName?: string;
  enableSaslOauthbearerUnsecureJwt?: boolean;
  // SASL OAuth JWT assertion
  saslOauthbearerAssertionAlgorithm?: "RS256" | "ES256";
  saslOauthbearerAssertionPrivateKeyFile?: string;
  saslOauthbearerAssertionPrivateKeyPassphrase?: string;
  saslOauthbearerAssertionPrivateKeyPem?: string;
  saslOauthbearerAssertionClaimAud?: string;
  saslOauthbearerAssertionClaimExpSeconds?: number;
  saslOauthbearerAssertionClaimIss?: string;
  saslOauthbearerAssertionClaimJtiInclude?: boolean;
  saslOauthbearerAssertionClaimNbfSeconds?: number;
  saslOauthbearerAssertionClaimSub?: string;
}

/** Consumer-specific rdkafka configuration options. */
export interface KafkaConsumerRdKafkaConfig {
  groupInstanceId?: string;
  partitionAssignmentStrategy?: string;
  sessionTimeoutMs?: number;
  heartbeatIntervalMs?: number;
  groupProtocol?: "classic" | "consumer";
  groupProtocolType?: string;
  groupRemoteAssignor?: string;
  coordinatorQueryIntervalMs?: number;
  maxPollIntervalMs?: number;
  autoCommitIntervalMs?: number;
  queuedMinMessages?: number;
  queuedMaxMessagesKbytes?: number;
  fetchWaitMaxMs?: number;
  fetchQueueBackoffMs?: number;
  fetchMessageMaxBytes?: number;
  fetchMaxBytes?: number;
  fetchMinBytes?: number;
  fetchErrorBackoffMs?: number;
  isolationLevel?: "read_uncommitted" | "read_committed";
  enablePartitionEof?: boolean;
  checkCrcs?: boolean;
  autoOffsetReset?: "smallest" | "earliest" | "beginning" | "largest" | "latest" | "end" | "error";
}

/** Producer-specific rdkafka configuration options. */
export interface KafkaProducerRdKafkaConfig {
  transactionalId?: string;
  transactionTimeoutMs?: number;
  enableIdempotence?: boolean;
  enableGaplessGuarantee?: boolean;
  queueBufferingMaxMessages?: number;
  queueBufferingMaxKbytes?: number;
  lingerMs?: number;
  messageSendMaxRetries?: number;
  compressionCodec?: "none" | "gzip" | "snappy" | "lz4" | "zstd";
  batchNumMessages?: number;
  batchSize?: number;
  stickyPartitioningLingerMs?: number;
  deliveryReportOnlyError?: boolean;
  messageTimeoutMs?: number;
  requestTimeoutMs?: number;
  requestRequiredAcks?: number;
}

const GLOBAL_MAP: Record<keyof KafkaRdKafkaConfig, string> = {
  socketTimeoutMs: "socket.timeout.ms",
  socketKeepaliveEnable: "socket.keepalive.enable",
  socketSendBufferBytes: "socket.send.buffer.bytes",
  socketReceiveBufferBytes: "socket.receive.buffer.bytes",
  socketNagleDisable: "socket.nagle.disable",
  socketMaxFails: "socket.max.fails",
  socketConnectionSetupTimeoutMs: "socket.connection.setup.timeout.ms",
  connectionsMaxIdleMs: "connections.max.idle.ms",
  brokerAddressTtl: "broker.address.ttl",
  brokerAddressFamily: "broker.address.family",
  reconnectBackoffMs: "reconnect.backoff.ms",
  reconnectBackoffMaxMs: "reconnect.backoff.max.ms",
  reconnectBackoffJitterMs: "reconnect.backoff.jitter.ms",
  messageMaxBytes: "message.max.bytes",
  messageCopyMaxBytes: "message.copy.max.bytes",
  receiveMessageMaxBytes: "receive.message.max.bytes",
  maxInFlight: "max.in.flight",
  metadataMaxAgeMs: "metadata.max.age.ms",
  topicMetadataRefreshIntervalMs: "topic.metadata.refresh.interval.ms",
  topicMetadataRefreshSparse: "topic.metadata.refresh.sparse",
  topicMetadataRefreshFastIntervalMs: "topic.metadata.refresh.fast.interval.ms",
  topicMetadataPropagationMaxMs: "topic.metadata.propagation.max.ms",
  metadataRecoveryStrategy: "metadata.recovery.strategy",
  clientRack: "client.rack",
  allowAutoCreateTopics: "allow.auto.create.topics",
  debug: "debug",
  statisticsIntervalMs: "statistics.interval.ms",
  enableMetricsPush: "enable.metrics.push",
  logLevel: "log_level",
  logConnectionClose: "log.connection.close",
  securityProtocol: "security.protocol",
  sslCaLocation: "ssl.ca.location",
  sslCaPem: "ssl.ca.pem",
  sslCertificateLocation: "ssl.certificate.location",
  sslCertificatePem: "ssl.certificate.pem",
  sslKeyLocation: "ssl.key.location",
  sslKeyPem: "ssl.key.pem",
  sslKeyPassword: "ssl.key.password",
  sslCipherSuites: "ssl.cipher.suites",
  sslCurvesList: "ssl.curves.list",
  sslSigalgsList: "ssl.sigalgs.list",
  sslCrlLocation: "ssl.crl.location",
  sslKeystoreLocation: "ssl.keystore.location",
  sslKeystorePassword: "ssl.keystore.password",
  enableSslCertificateVerification: "enable.ssl.certificate.verification",
  sslEndpointIdentificationAlgorithm: "ssl.endpoint.identification.algorithm",
  saslKerberosServiceName: "sasl.kerberos.service.name",
  saslKerberosPrincipal: "sasl.kerberos.principal",
  saslKerberosKinitCmd: "sasl.kerberos.kinit.cmd",
  saslKerberosKeytab: "sasl.kerberos.keytab",
  saslKerberosMinTimeBeforeRelogin: "sasl.kerberos.min.time.before.relogin",
  saslOauthbearerMethod: "sasl.oauthbearer.method",
  saslOauthbearerClientId: "sasl.oauthbearer.client.id",
  saslOauthbearerClientSecret: "sasl.oauthbearer.client.secret",
  saslOauthbearerScope: "sasl.oauthbearer.scope",
  saslOauthbearerExtensions: "sasl.oauthbearer.extensions",
  saslOauthbearerTokenEndpointUrl: "sasl.oauthbearer.token.endpoint.url",
  saslOauthbearerGrantType: "sasl.oauthbearer.grant.type",
  saslOauthbearerSubClaimName: "sasl.oauthbearer.sub.claim.name",
  enableSaslOauthbearerUnsecureJwt: "enable.sasl.oauthbearer.unsecure.jwt",
  saslOauthbearerAssertionAlgorithm: "sasl.oauthbearer.assertion.algorithm",
  saslOauthbearerAssertionPrivateKeyFile: "sasl.oauthbearer.assertion.private.key.file",
  saslOauthbearerAssertionPrivateKeyPassphrase: "sasl.oauthbearer.assertion.private.key.passphrase",
  saslOauthbearerAssertionPrivateKeyPem: "sasl.oauthbearer.assertion.private.key.pem",
  saslOauthbearerAssertionClaimAud: "sasl.oauthbearer.assertion.claim.aud",
  saslOauthbearerAssertionClaimExpSeconds: "sasl.oauthbearer.assertion.claim.exp.seconds",
  saslOauthbearerAssertionClaimIss: "sasl.oauthbearer.assertion.claim.iss",
  saslOauthbearerAssertionClaimJtiInclude: "sasl.oauthbearer.assertion.claim.jti.include",
  saslOauthbearerAssertionClaimNbfSeconds: "sasl.oauthbearer.assertion.claim.nbf.seconds",
  saslOauthbearerAssertionClaimSub: "sasl.oauthbearer.assertion.claim.sub",
};

const CONSUMER_MAP: Record<keyof KafkaConsumerRdKafkaConfig, string> = {
  groupInstanceId: "group.instance.id",
  partitionAssignmentStrategy: "partition.assignment.strategy",
  sessionTimeoutMs: "session.timeout.ms",
  heartbeatIntervalMs: "heartbeat.interval.ms",
  groupProtocol: "group.protocol",
  groupProtocolType: "group.protocol.type",
  groupRemoteAssignor: "group.remote.assignor",
  coordinatorQueryIntervalMs: "coordinator.query.interval.ms",
  maxPollIntervalMs: "max.poll.interval.ms",
  autoCommitIntervalMs: "auto.commit.interval.ms",
  queuedMinMessages: "queued.min.messages",
  queuedMaxMessagesKbytes: "queued.max.messages.kbytes",
  fetchWaitMaxMs: "fetch.wait.max.ms",
  fetchQueueBackoffMs: "fetch.queue.backoff.ms",
  fetchMessageMaxBytes: "fetch.message.max.bytes",
  fetchMaxBytes: "fetch.max.bytes",
  fetchMinBytes: "fetch.min.bytes",
  fetchErrorBackoffMs: "fetch.error.backoff.ms",
  isolationLevel: "isolation.level",
  enablePartitionEof: "enable.partition.eof",
  checkCrcs: "check.crcs",
  autoOffsetReset: "auto.offset.reset",
};

const PRODUCER_MAP: Record<keyof KafkaProducerRdKafkaConfig, string> = {
  transactionalId: "transactional.id",
  transactionTimeoutMs: "transaction.timeout.ms",
  enableIdempotence: "enable.idempotence",
  enableGaplessGuarantee: "enable.gapless.guarantee",
  queueBufferingMaxMessages: "queue.buffering.max.messages",
  queueBufferingMaxKbytes: "queue.buffering.max.kbytes",
  lingerMs: "linger.ms",
  messageSendMaxRetries: "message.send.max.retries",
  compressionCodec: "compression.codec",
  batchNumMessages: "batch.num.messages",
  batchSize: "batch.size",
  stickyPartitioningLingerMs: "sticky.partitioning.linger.ms",
  deliveryReportOnlyError: "delivery.report.only.error",
  messageTimeoutMs: "message.timeout.ms",
  requestTimeoutMs: "request.timeout.ms",
  requestRequiredAcks: "request.required.acks",
};

function convertConfig<T extends object>(config: T, map: Record<keyof T, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(map) as (keyof T)[]) {
    const value = config[key];
    if (value) result[map[key]] = value;
  }
  return result;
}

/** Converts {@link KafkaRdKafkaConfig} to a flat rdkafka global config object. */
export function toGlobalRdKafkaConfig(config?: KafkaRdKafkaConfig): Record<string, unknown> {
  return config ? convertConfig(config, GLOBAL_MAP) : {};
}

/** Converts {@link KafkaConsumerRdKafkaConfig} to a flat rdkafka consumer config object. */
export function toConsumerRdKafkaConfig(config?: KafkaConsumerRdKafkaConfig): Record<string, unknown> {
  return config ? convertConfig(config, CONSUMER_MAP) : {};
}

/** Converts {@link KafkaProducerRdKafkaConfig} to a flat rdkafka producer config object. */
export function toProducerRdKafkaConfig(config?: KafkaProducerRdKafkaConfig): Record<string, unknown> {
  return config ? convertConfig(config, PRODUCER_MAP) : {};
}

/** Returns true if any SSL-related keys are present in the global rdkafka config. */
export function hasSslConfig(config?: KafkaRdKafkaConfig): boolean {
  if (!config) return false;
  return Object.keys(toGlobalRdKafkaConfig(config)).some((k) => k.startsWith("ssl."));
}
