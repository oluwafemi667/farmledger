/**
 * Lifecycle of a locally created record. The UI distinguishes all five
 * states so a farmhand always knows whether a record is safe on the server.
 *
 *  local    -> written to this device only, not yet queued
 *  waiting  -> queued, will upload when a connection is available
 *  syncing  -> upload in progress
 *  synced   -> confirmed by the server
 *  failed   -> upload rejected or errored; never discarded, can be retried
 */
export type SyncState = "local" | "waiting" | "syncing" | "synced" | "failed";

export type Tone = "positive" | "neutral" | "attention" | "danger";
