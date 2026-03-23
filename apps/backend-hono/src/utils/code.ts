export const MemoCode = {
  NotFound: 20001,
  ValidationFailed: 20002,
  NoPermission: 20003,
};

export const UserCode = {
  NotFound: 30001,
};

export const AuthCode = {
  AlreadyExist: 40001,
  AccountPasswordMismatch: 40002,
  NotFound: 40003,
};

export const ResourceCode = {
  NotFound: 50001,
  NoPermission: 50002,
  illegalParam: 50003,
};

export const GeneralCode = {
  Success: 0,
  NeedLogin: 10001,
  InternalError: 50000,
};

export const AdminCode = {
  Forbidden: 60001, // 403 - User is authenticated but not admin
  UserNotFound: 60002, // 404 - Target user not found
  SettingNotFound: 60003, // 404 - Setting key not found
  LastAdmin: 60004, // 403 - Cannot remove last admin
  SelfAction: 60005, // 403 - Cannot perform action on self
  EncryptionKeyMissing: 60006, // 500 - SETTINGS_ENCRYPTION_KEY not configured
};
