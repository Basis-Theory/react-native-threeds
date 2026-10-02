import type { CreateNativeThreeDSSessionRequest } from '../types';

export const TOKEN_REFERENCE_ERROR =
  'Provide exactly one of tokenId or tokenIntentId.';

const isPresent = (value?: string): boolean => Boolean(value?.trim());

/** Blank and whitespace-only strings count as missing, matching the native modules. */
export const hasExactlyOneTokenReference = (
  request: CreateNativeThreeDSSessionRequest
): boolean => isPresent(request.tokenId) !== isPresent(request.tokenIntentId);
