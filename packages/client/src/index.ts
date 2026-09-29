/**
 * @roomriddle/client: the RoomRiddle protocol client, shared by the TV and phones.
 * No framework, no game rules: it connects, resumes sessions and folds server
 * snapshots into a RoomView.
 */
export {RoomClient} from './RoomClient';
export type {ConnectionStatus, RoomClientOptions, SessionStore, SocketLike} from './RoomClient';
export {initialRoomView, reduceRoomView, withConnection, serverNow, isHost, me} from './roomView';
export type {RoomView} from './roomView';
export {memorySessionStore} from './stores';
export {errorText} from './errorText';
export {errorExperience, RECOVERY_LABEL, LOADING_COPY} from './experience';
export type {ErrorExperience, ErrorKind, RecoveryAction, LoadingKind} from './experience';
