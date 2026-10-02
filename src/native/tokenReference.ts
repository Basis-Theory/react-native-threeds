import type { CreateNativeThreeDSSessionRequest } from '../types';

export const TOKEN_REFERENCE_ERROR =
  'Provide exactly one of tokenId or tokenIntentId.';

/** Blank strings count as missing, matching the native modules. */
export const hasExactlyOneTokenReference = (
  request: CreateNativeThreeDSSessionRequest
): boolean => Boolean(request.tokenId) !== Boolean(request.tokenIntentId);
