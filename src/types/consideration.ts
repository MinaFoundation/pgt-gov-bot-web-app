import { ProposalStatus } from '@prisma/client';

export interface ConsiderationVoteStats {
  approved: number;
  rejected: number;
  total: number;
}

export interface ConsiderationUserVote {
  decision: 'APPROVED' | 'REJECTED';
  feedback: string;
}

export interface ConsiderationProposal {
  id: number;
  proposalName: string;
  submitter: string;
  abstract: string;
  status: 'pending' | 'approved' | 'rejected';
  userVote?: ConsiderationUserVote;
  isReviewerEligible?: boolean;
  voteStats: ConsiderationVoteStats;
  createdAt: Date;
  currentPhase: ProposalStatus;
}
 