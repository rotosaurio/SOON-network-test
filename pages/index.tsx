import { useState, useEffect } from 'react';
import { PublicKey, Transaction, TransactionInstruction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { connection } from '../config/connection';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import { ReactNode } from 'react';
import { lockTokensInstruction, unlockTokensInstruction, modifyLockDurationInstruction, forceUnlockInstruction } from '../utils/tokenLockProgram';

const DynamicWalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

const PROGRAM_ID = new PublicKey('G6eofqRVKcjGB8WNerfhbE8dMDJSty9rR4W4ze8uEDjQ');
const OWNER_ADDRESS = 'HV11ZN4HA7QJvuifjSoJ5nMXz7Di3ZrzuwCUoLwPNMsn';

const ClientOnly = ({ children, ...delegated }: { children: ReactNode; [key: string]: any }) => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  return <div {...delegated}>{children}</div>;
};

export default function TokenLocker() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [isOwner, setIsOwner] = useState(false);
  const [tokensToLock, setTokensToLock] = useState('');
  const [lockTime, setLockTime] = useState('');
  const [targetAddress, setTargetAddress] = useState('');
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (publicKey) {
      setIsOwner(publicKey.toBase58() === OWNER_ADDRESS);
      updateBalance();
    }
  }, [publicKey]);

  const updateBalance = async () => {
    if (publicKey) {
      const balance = await connection.getBalance(publicKey);
      setBalance(balance / LAMPORTS_PER_SOL);
    }
  };

  const createInstruction = (instructionType: number, data: Buffer): TransactionInstruction => {
    if (!publicKey) {
      throw new Error("La clave pública no está disponible");
    }
    
    return new TransactionInstruction({
      keys: [
        { pubkey: publicKey, isSigner: true, isWritable: true },
      ],
      programId: PROGRAM_ID,
      data: Buffer.concat([Buffer.from([instructionType]), data])
    });
  };

  const sendTransactionWrapper = async (instruction: TransactionInstruction) => {
    const transaction = new Transaction().add(instruction);
    try {
      const signature = await sendTransaction(transaction, connection);
      console.log('Transacción enviada:', signature);
      await connection.confirmTransaction(signature, 'confirmed');
      updateBalance();
    } catch (error) {
      console.error('Error al enviar la transacción:', error);
    }
  };

  const lockTokens = async () => {
    if (!publicKey) return;
    const amount = parseFloat(tokensToLock) * LAMPORTS_PER_SOL;
    const instruction = lockTokensInstruction(amount, publicKey);
    await sendTransactionWrapper(instruction);
  };

  const unlockTokens = async () => {
    if (!publicKey) return;
    const instruction = unlockTokensInstruction(publicKey);
    await sendTransactionWrapper(instruction);
  };

  const changeLockTime = async () => {
    if (!publicKey || !isOwner) return;
    const newDuration = parseInt(lockTime);
    const instruction = modifyLockDurationInstruction(newDuration, publicKey);
    await sendTransactionWrapper(instruction);
  };

  const forceUnlock = async () => {
    if (!publicKey || !isOwner) return;
    const targetPublicKey = new PublicKey(targetAddress);
    const instruction = forceUnlockInstruction(targetPublicKey, publicKey);
    await sendTransactionWrapper(instruction);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-4">Token Lock</h2>
            <ClientOnly>
              {!publicKey ? (
                <DynamicWalletMultiButton className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded" />
              ) : (
                <>
                  <p>Wallet conectada: {publicKey.toString()}</p>
                  <p>Balance: {balance.toFixed(4)} SOL</p>
                  <div className="mb-4">
                    <input
                      type="number"
                      value={tokensToLock}
                      onChange={(e) => setTokensToLock(e.target.value)}
                      placeholder="Cantidad de tokens a bloquear"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    />
                  </div>
                  <div className="mb-4">
                    <button onClick={lockTokens} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2">
                      Bloquear Tokens
                    </button>
                    <button onClick={unlockTokens} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                      Desbloquear Tokens
                    </button>
                  </div>
                  {isOwner && (
                    <>
                      <div className="mb-4">
                        <input
                          type="number"
                          value={lockTime}
                          onChange={(e) => setLockTime(e.target.value)}
                          placeholder="Nuevo tiempo de bloqueo (segundos)"
                          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        />
                      </div>
                      <div className="mb-4">
                        <button onClick={changeLockTime} className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded mr-2">
                          Cambiar Tiempo de Bloqueo
                        </button>
                      </div>
                      <div className="mb-4">
                        <input
                          type="text"
                          value={targetAddress}
                          onChange={(e) => setTargetAddress(e.target.value)}
                          placeholder="Dirección objetivo para desbloqueo forzado"
                          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        />
                      </div>
                      <div className="mb-4">
                        <button onClick={forceUnlock} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mr-2">
                          Desbloqueo Forzado
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </ClientOnly>
          </div>
        </div>
      </div>
    </div>
  );
}
