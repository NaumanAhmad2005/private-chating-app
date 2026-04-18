// Socket event constants
export const ClientEvents = {
  JOIN: 'user:join',
  LEAVE: 'user:leave',
  MESSAGE_SEND: 'message:send',
  DM_CREATE: 'dm:create',
  DM_SEND: 'dm:send',
  DM_CLOSE: 'dm:close',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
};

export const ServerEvents = {
  USER_JOINED: 'user:joined',
  USER_LEFT: 'user:left',
  USERS_LIST: 'users:list',
  MESSAGE_NEW: 'message:new',
  DM_CREATED: 'dm:created',
  DM_RECEIVED: 'dm:received',
  DM_CLOSED: 'dm:closed',
  TYPING_UPDATE: 'typing:update',
  ERROR: 'error',
};
