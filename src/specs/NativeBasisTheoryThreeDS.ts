import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type NativeThreeDSSession = {
  id: string;
  cardBrand: string;
  additionalCardBrands: ReadonlyArray<string>;
};

export type NativeThreeDSResult = {
  id: string;
  status: string;
  details?: string;
};

/**
 * Codegen treats this interface as the build-time contract between JavaScript
 * and both native platforms. The configuration is flattened into supported
 * primitive values so the generated iOS and Android signatures stay stable.
 */
export interface Spec extends TurboModule {
  configure(
    apiKey: string,
    authenticationEndpoint: string,
    apiBaseUrl: string,
    sandbox: boolean,
    locale: string,
    authenticationEndpointHeadersJson: string
  ): Promise<ReadonlyArray<string>>;

  createSession(
    tokenId: string,
    tokenIntentId: string
  ): Promise<NativeThreeDSSession>;

  startAuthentication(sessionId: string): Promise<NativeThreeDSResult>;
}

// Codegen requires this canonical declaration to discover the native contract.
// Runtime lookup is intentionally handled by the facade outside `src/specs`.
export default TurboModuleRegistry.get<Spec>('NativeBasisTheoryThreeDS');
