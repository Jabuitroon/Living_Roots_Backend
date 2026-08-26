export interface PreAuthPayload {
  sub: string
  typ: 'pre_2fa'
}

export interface TrustedDeviceResult {
  rawToken: string
  expiresAt: Date
}
