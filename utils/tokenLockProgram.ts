import { PublicKey, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import * as borsh from 'borsh';

export const PROGRAM_ID = new PublicKey('GFGyUDBPeKyhveN6NMb2LUF3L4x88dyr3HtWoJ18FiED');
export const RPC_ENDPOINT = 'https://rpc.devnet.soo.network/rpc';

enum InstructionType {
  LockTokens,
  UnlockTokens,
  ModifyLockDuration,
  ForceUnlock,
}

class Instruction {
  instruction: InstructionType;
  amount?: bigint;
  newDuration?: number;
  target?: Uint8Array;

  constructor(props: { instruction: InstructionType; amount?: number; newDuration?: number; target?: PublicKey }) {
    this.instruction = props.instruction;
    if (props.amount !== undefined) this.amount = BigInt(props.amount);
    if (props.newDuration !== undefined) this.newDuration = props.newDuration;
    if (props.target !== undefined) this.target = props.target.toBuffer();
  }
}

const instructionSchema = new Map([
  [Instruction, {
    kind: 'struct',
    fields: [
      ['instruction', 'u8'],
      ['amount', { kind: 'option', type: 'u64' }],
      ['newDuration', { kind: 'option', type: 'u32' }],
      ['target', { kind: 'option', type: { array: { type: 'u8', len: 32 } } }],
    ]
  }]
]);

function serializeInstruction(instruction: Instruction): Buffer {
  const buffer = borsh.serialize(instructionSchema, instruction);
  return Buffer.from(buffer);
}

export const lockTokensInstruction = (amount: number, userPubkey: PublicKey): TransactionInstruction => {
  const data = serializeInstruction(new Instruction({ instruction: InstructionType.LockTokens, amount }));

  return new TransactionInstruction({
    keys: [
      { pubkey: userPubkey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: data,
  });
};

export const unlockTokensInstruction = (userPubkey: PublicKey): TransactionInstruction => {
  const data = serializeInstruction(new Instruction({ instruction: InstructionType.UnlockTokens }));

  return new TransactionInstruction({
    keys: [
      { pubkey: userPubkey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: data,
  });
};

export const modifyLockDurationInstruction = (newDuration: number, ownerPubkey: PublicKey): TransactionInstruction => {
  const data = serializeInstruction(new Instruction({ instruction: InstructionType.ModifyLockDuration, newDuration }));

  return new TransactionInstruction({
    keys: [
      { pubkey: ownerPubkey, isSigner: true, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: data,
  });
};

export const forceUnlockInstruction = (target: PublicKey, ownerPubkey: PublicKey): TransactionInstruction => {
  const data = serializeInstruction(new Instruction({ instruction: InstructionType.ForceUnlock, target }));

  return new TransactionInstruction({
    keys: [
      { pubkey: target, isSigner: false, isWritable: true },
      { pubkey: ownerPubkey, isSigner: true, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: data,
  });
};
