import { useContext } from 'react';
import { BasisTheory3dsContext } from './BasisTheory3dsProvider';

export const useBasisTheory3ds = () => {
  const context = useContext(BasisTheory3dsContext);

  if (!context) {
    throw new Error(
      'useBasisTheory3ds must be used within a BasisTheory3dsProvider'
    );
  }

  const { createSession, startChallenge } = context;

  return { createSession, startChallenge };
};
