import { Types } from 'aptos';
import BloctoSDK, { AptosProviderInterface as IBloctoAptos } from '@blocto/sdk';
import {
  WalletAccountChangeError,
  WalletDisconnectionError,
  WalletNetworkChangeError,
  WalletNotConnectedError,
  WalletNotReadyError,
  WalletSignAndSubmitMessageError,
  WalletSignMessageError,
  WalletSignTransactionError
} from '../WalletProviders/errors';
import {
  AccountKeys,
  BaseWalletAdapter,
  scopePollingDetectionStrategy,
  WalletName,
  WalletReadyState,
  SignMessagePayload,
  SignMessageResponse,
  NetworkInfo,
  WalletAdapterNetwork
} from './BaseAdapter';

export const BloctoWalletName = 'Blocto' as WalletName<'Blocto'>;

export interface BloctoWalletAdapterConfig {
  provider?: IBloctoAptos;
  network: Exclude<WalletAdapterNetwork, WalletAdapterNetwork.Devnet>;
  timeout?: number;
  bloctoAppId?: string;
}

export const APTOS_NETWORK_CHAIN_ID_MAPPING = {
  // MAINNET
  [WalletAdapterNetwork.Mainnet]: 1,
  // TESTNET
  [WalletAdapterNetwork.Testnet]: 2
};

export class BloctoWalletAdapter extends BaseWalletAdapter {
  name = BloctoWalletName;

  url = 'https://portto.com/download';

  icon =
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgdmlld0JveD0iMCAwIDUwMCA1MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MDAiIGhlaWdodD0iNTAwIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTUxLjg0MSAyOTMuNzQ5QzE1MC44OSAyOTMuNzQ3IDE0OS45NSAyOTMuOTQ1IDE0OS4wNzkgMjk0LjMyOEMxNDguMjA5IDI5NC43MTEgMTQ3LjQyOCAyOTUuMjcyIDE0Ni43ODcgMjk1Ljk3NEMxNDYuMTQ2IDI5Ni42NzYgMTQ1LjY1OSAyOTcuNTA1IDE0NS4zNTYgMjk4LjQwNkMxNDUuMDU0IDI5OS4zMDggMTQ0Ljk0MyAzMDAuMjYyIDE0NS4wMyAzMDEuMjA5QzE0Ny42NTIgMzI4LjI1NSAxNjAuMjUgMzUzLjM1NiAxODAuMzcgMzcxLjYxOUMyMDAuNDg5IDM4OS44ODMgMjI2LjY4OCA0MDAuMDAxIDI1My44NjEgNDAwLjAwMUMyODEuMDMzIDQwMC4wMDEgMzA3LjIzMiAzODkuODgzIDMyNy4zNTIgMzcxLjYxOUMzNDcuNDcxIDM1My4zNTYgMzYwLjA2OSAzMjguMjU1IDM2Mi42OTEgMzAxLjIwOUMzNjIuNzc4IDMwMC4yNjIgMzYyLjY2NyAyOTkuMzA4IDM2Mi4zNjUgMjk4LjQwNkMzNjIuMDYyIDI5Ny41MDUgMzYxLjU3NSAyOTYuNjc2IDM2MC45MzQgMjk1Ljk3NEMzNjAuMjkzIDI5NS4yNzIgMzU5LjUxMiAyOTQuNzExIDM1OC42NDIgMjk0LjMyOEMzNTcuNzcyIDI5My45NDUgMzU2LjgzMSAyOTMuNzQ3IDM1NS44OCAyOTMuNzQ5SDE1MS44NDFaIiBmaWxsPSIjQUREM0YwIi8+CjxwYXRoIGQ9Ik0xNTEuODM5IDEwMEMxNzcuMDM3IDEwMCAyMDEuMjAzIDExMC4wMSAyMTkuMDIgMTI3LjgyOEMyMzYuODM4IDE0NS42NDYgMjQ2Ljg0OCAxNjkuODExIDI0Ni44NDggMTk1LjAwOVYyNzIuMDE2QzI0Ni44NDggMjczLjgyNSAyNDYuMTI5IDI3NS41NiAyNDQuODUgMjc2LjgzOUMyNDMuNTcxIDI3OC4xMTggMjQxLjgzNiAyNzguODM3IDI0MC4wMjcgMjc4LjgzN0gxNTEuODM5QzE1MC4wMyAyNzguODM3IDE0OC4yOTUgMjc4LjExOCAxNDcuMDE2IDI3Ni44MzlDMTQ1LjczNyAyNzUuNTYgMTQ1LjAxOCAyNzMuODI1IDE0NS4wMTggMjcyLjAxNlYxMDYuODIxQzE0NS4wMTggMTA1LjAxMiAxNDUuNzM3IDEwMy4yNzcgMTQ3LjAxNiAxMDEuOTk4QzE0OC4yOTUgMTAwLjcxOSAxNTAuMDMgMTAwIDE1MS44MzkgMTAwWiIgZmlsbD0iIzFDMkQ2NiIvPgo8cGF0aCBkPSJNMjY4LjU1MyAxODIuMDA4SDI3My4wNDNDMjg0LjgyIDE4Mi4wMDggMjk2LjQ4MSAxODQuMzI3IDMwNy4zNjIgMTg4LjgzNEMzMTguMjQyIDE5My4zNDEgMzI4LjEyOCAxOTkuOTQ3IDMzNi40NTYgMjA4LjI3NEMzNDQuNzgzIDIxNi42MDEgMzUxLjM4OSAyMjYuNDg3IDM1NS44OTUgMjM3LjM2OEMzNjAuNDAyIDI0OC4yNDggMzYyLjcyMiAyNTkuOTA5IDM2Mi43MjIgMjcxLjY4NlYyNzIuMDE2QzM2Mi43MjIgMjczLjgyNSAzNjIuMDAzIDI3NS41NiAzNjAuNzI0IDI3Ni44MzlDMzU5LjQ0NSAyNzguMTE4IDM1Ny43MSAyNzguODM3IDM1NS45MDEgMjc4LjgzN0gzMDUuNTA2QzI5My44OTQgMjc4LjgzNyAyODIuNzU3IDI3NC4yMjQgMjc0LjU0NiAyNjYuMDEzQzI2Ni4zMzUgMjU3LjgwMiAyNjEuNzIyIDI0Ni42NjUgMjYxLjcyMiAyMzUuMDUzVjE4OC43ODhDMjYxLjczMyAxODYuOTg1IDI2Mi40NTggMTg1LjI1OSAyNjMuNzM4IDE4My45ODhDMjY1LjAxOCAxODIuNzE3IDI2Ni43NDkgMTgyLjAwNSAyNjguNTUzIDE4Mi4wMDhaIiBmaWxsPSIjMzQ3RUI4Ii8+Cjwvc3ZnPgo=';

  protected _provider: IBloctoAptos | undefined;

  protected _network: Exclude<WalletAdapterNetwork, WalletAdapterNetwork.Devnet>;

  protected _chainId: string;

  protected _api: string;

  protected _timeout: number;

  protected _readyState: WalletReadyState =
    typeof window === 'undefined' || typeof document === 'undefined'
      ? WalletReadyState.Unsupported
      : WalletReadyState.NotDetected;

  protected _connecting: boolean;

  protected _wallet: any | null;

  constructor(
    { network, timeout = 10000, bloctoAppId = '' }: BloctoWalletAdapterConfig = {
      network: WalletAdapterNetwork.Testnet
    }
  ) {
    super();

    const sdk = new BloctoSDK({
      aptos: {
        chainId: APTOS_NETWORK_CHAIN_ID_MAPPING[network]
      },
      appId: bloctoAppId
    });

    this._provider = sdk.aptos;
    this._network = network;
    this._timeout = timeout;
    this._connecting = false;
    this._wallet = null;

    if (typeof window !== 'undefined' && this._readyState !== WalletReadyState.Unsupported) {
      scopePollingDetectionStrategy(() => {
        if (window) {
          this._readyState = WalletReadyState.Installed;
          return true;
        }
        return false;
      });
    }
  }

  get publicAccount(): AccountKeys {
    return {
      publicKey: this._wallet?.publicKey || null,
      address: this._wallet?.address || null,
      authKey: this._wallet?.authKey || null,
      minKeysRequired: this._wallet?.minKeysRequired
    };
  }

  get network(): NetworkInfo {
    return {
      name: this._network,
      api: this._api,
      chainId: this._chainId
    };
  }

  get connecting(): boolean {
    return this._connecting;
  }

  get connected(): boolean {
    return !!this._wallet?.isConnected;
  }

  get readyState(): WalletReadyState {
    return this._readyState;
  }

  async connect(): Promise<void> {
    try {
      if (this.connected || this.connecting) return;
      if (
        !(
          this._readyState === WalletReadyState.Loadable ||
          this._readyState === WalletReadyState.Installed
        )
      )
        throw new WalletNotReadyError();

      this._connecting = true;
      const provider = this._provider;
      const isConnected = await provider?.isConnected();
      if (isConnected) {
        await provider?.disconnect();
      }

      const { publicKey, ...rest } = await provider?.connect();
      this._wallet = {
        ...rest,
        publicKey,
        isConnected: true
      };

      const { api, chainId } = await provider.network();
      this._api = api;
      this._chainId = chainId;

      this.emit('connect', this._wallet);
    } catch (error: any) {
      this.emit('error', error);
      throw error;
    } finally {
      this._connecting = false;
    }
  }

  async disconnect(): Promise<void> {
    const wallet = this._wallet;
    const provider = this._provider;
    if (wallet) {
      this._wallet = null;
      try {
        await provider?.disconnect();
      } catch (error: any) {
        this.emit('error', new WalletDisconnectionError(error?.message, error));
      }
    }

    this.emit('disconnect');
  }

  async signTransaction(transaction: Types.TransactionPayload): Promise<Uint8Array> {
    try {
      try {
        const provider = this._provider;
        const response = await provider?.signTransaction(transaction as Types.EntryFunctionPayload);
        if (response) {
          return new Uint8Array([]);
        } else {
          throw new Error('Transaction failed');
        }
      } catch (error: any) {
        throw new WalletSignTransactionError(error?.message, error);
      }
    } catch (error: any) {
      this.emit('error', error);
      throw error;
    }
  }

  async signAndSubmitTransaction(
    transaction: Types.TransactionPayload
  ): Promise<{ hash: Types.HexEncodedBytes }> {
    try {
      try {
        const provider = this._provider;
        const response = await provider?.signAndSubmitTransaction(
          transaction as Types.EntryFunctionPayload
        );
        if (response) {
          return { hash: response.hash };
        } else {
          throw new Error('Transaction failed');
        }
      } catch (error: any) {
        throw new WalletSignAndSubmitMessageError(error.message || error);
      }
    } catch (error: any) {
      this.emit('error', error);
      throw error;
    }
  }

  async signMessage(message: SignMessagePayload): Promise<SignMessageResponse> {
    try {
      const provider = this._provider;
      const response = await provider?.signMessage(message);

      if (response) {
        return response;
      } else {
        throw new Error('Sign Message failed');
      }
    } catch (error: any) {
      const errMsg = error.message;
      this.emit('error', new WalletSignMessageError(errMsg));
      throw error;
    }
  }

  async onAccountChange(): Promise<void> {
    try {
      const wallet = this._wallet;
      const provider = this._provider;
      if (!wallet || !provider) throw new WalletNotConnectedError();
      //To be implemented
    } catch (error: any) {
      const errMsg = error.message;
      this.emit('error', new WalletAccountChangeError(errMsg));
      throw error;
    }
  }

  async onNetworkChange(): Promise<void> {
    try {
      const wallet = this._wallet;
      const provider = this._provider;
      if (!wallet || !provider) throw new WalletNotConnectedError();
      //To be implemented
    } catch (error: any) {
      const errMsg = error.message;
      this.emit('error', new WalletNetworkChangeError(errMsg));
      throw error;
    }
  }
}
