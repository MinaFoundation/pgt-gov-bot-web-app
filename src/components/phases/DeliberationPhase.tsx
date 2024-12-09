'use client'

import { useState, useCallback, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDeliberationPhase, useDeliberationVote } from '@/hooks'
import { DeliberationDialog } from "@/components/dialogs/DeliberationDialog"
import Link from 'next/link'
import type { DeliberationProposal, DeliberationComment, DeliberationVote } from '@/types/deliberation'
import { ReviewerComments } from "@/components/ReviewerComments"
import { useAuth } from "@/contexts/AuthContext"

interface Props {
  fundingRoundId: string;
  fundingRoundName: string;
}

interface DialogState {
  open: boolean;
  proposalId?: number;
  mode?: 'recommend' | 'not-recommend' | 'community';
  existingVote?: DeliberationVote;
}

export function DeliberationPhase({ fundingRoundId, fundingRoundName }: Props) {
  const { user } = useAuth()
  const { proposals, loading, setProposals, pendingCount, totalCount, setPendingCount, setTotalCount } = useDeliberationPhase(fundingRoundId)
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [dialogProps, setDialogProps] = useState<DialogState>({ open: false })
  
  const toggleExpanded = (proposalId: number) => {
    setExpanded(prev => ({
      ...prev,
      [proposalId]: !prev[proposalId]
    }))
  }

  const { submitVote, isLoading } = useDeliberationVote();

  // Sort proposals - pending first, then voted
  const sortedProposals = useMemo(() => {
    return [...proposals].sort((a, b) => {
      if (!a.userDeliberation && b.userDeliberation) return -1;
      if (a.userDeliberation && !b.userDeliberation) return 1;
      return 0;
    });
  }, [proposals]);

  const handleSubmit = async (feedback: string, recommendation?: boolean) => {
    if (!dialogProps.proposalId || !user) return;

    try {
      const response = await submitVote(
        dialogProps.proposalId,
        feedback,
        recommendation
      );

      if (response) {
        // Update proposals and recalculate counts
        setProposals(prevProposals => {
          const updatedProposals = prevProposals.map(proposal => {
            if (proposal.id !== dialogProps.proposalId) {
              return proposal;
            }

            // Create updated deliberation vote
            const updatedDeliberation = {
              feedback,
              recommendation,
              createdAt: new Date(),
              isReviewerVote: proposal.isReviewerEligible ?? false
            };

            // For reviewers, update or add the comment
            const updatedReviewerComments = recommendation !== undefined
              ? proposal.reviewerComments.some(c => c.reviewer.username === user.metadata.username)
                ? proposal.reviewerComments.map(c => 
                    c.reviewer.username === user.metadata.username
                      ? {
                          ...c,
                          feedback,
                          recommendation,
                          createdAt: new Date()
                        }
                      : c
                  )
                : [
                    ...proposal.reviewerComments,
                    {
                      id: response.id, // Use server-provided ID
                      feedback,
                      recommendation,
                      createdAt: new Date(),
                      reviewer: {
                        username: user.metadata.username
                      }
                    }
                  ]
              : proposal.reviewerComments;

            // Return updated proposal
            return {
              ...proposal,
              userDeliberation: updatedDeliberation,
              hasVoted: true,
              reviewerComments: updatedReviewerComments
            };
          }).sort((a, b) => {
            if (!a.userDeliberation && b.userDeliberation) return -1;
            if (a.userDeliberation && !b.userDeliberation) return 1;
            return 0;
          });

          // Update pending and total counts
          const newPendingCount = updatedProposals.filter(p => !p.hasVoted).length;
          setPendingCount(newPendingCount);
          setTotalCount(updatedProposals.length);

          return updatedProposals;
        });
      }

      setDialogProps({ open: false });
    } catch (error) {
      console.error("Failed to submit deliberation:", error);
    }
  };

  const openEditDialog = (proposal: DeliberationProposal) => {
    const mode = proposal.isReviewerEligible 
      ? proposal.userDeliberation?.recommendation 
        ? 'recommend' 
        : 'not-recommend'
      : 'community';

    setDialogProps({
      open: true,
      proposalId: proposal.id,
      mode,
      existingVote: proposal.userDeliberation
    });
  };

  const renderVoteStatus = (proposal: DeliberationProposal) => {
    if (!proposal.userDeliberation) return null;

    if (proposal.isReviewerEligible) {
      return (
        <Badge variant={proposal.userDeliberation.recommendation ? 'default' : 'destructive'}>
          {proposal.userDeliberation.recommendation ? '✅ Recommended' : '❌ Not Recommended'}
        </Badge>
      );
    }

    return (
      <Badge variant="secondary">
        💭 Deliberation Submitted
      </Badge>
    );
  };

  const renderActionButtons = (proposal: DeliberationProposal) => {
    if (proposal.userDeliberation) {
      return (
        <Button
          variant="outline"
          onClick={() => openEditDialog(proposal)}
        >
          ✏️ Edit {proposal.isReviewerEligible ? 'Review' : 'Deliberation'}
        </Button>
      );
    }

    if (proposal.isReviewerEligible) {
      return (
        <>
          <Button
            variant="default"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => setDialogProps({
              open: true,
              proposalId: proposal.id,
              mode: 'recommend'
            })}
          >
            ✅ Recommend for Vote
          </Button>
          <Button
            variant="destructive"
            onClick={() => setDialogProps({
              open: true,
              proposalId: proposal.id,
              mode: 'not-recommend'
            })}
          >
            ❌ Not Recommend
          </Button>
        </>
      );
    }

    return (
      <Button
        variant="secondary"
        onClick={() => setDialogProps({
          open: true,
          proposalId: proposal.id,
          mode: 'community'
        })}
      >
        💭 Deliberate
      </Button>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              Loading proposals...
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">
            💭 Deliberation Phase: {fundingRoundName}
            <span className="ml-2 text-lg font-normal text-muted-foreground">
              ({pendingCount} pending, {totalCount} total)
            </span>
          </h1>
        </div>

        <div className="space-y-6">
          {sortedProposals.map((proposal: DeliberationProposal) => (
            <Card key={proposal.id} className={cn(
              "hover:bg-muted/50 transition-colors",
              proposal.userDeliberation && "bg-muted/10"
            )}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">{proposal.proposalName}</CardTitle>
                    <CardDescription>
                      👤 Submitted by {proposal.submitter}
                    </CardDescription>
                  </div>
                  {renderVoteStatus(proposal)}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">Abstract</h3>
                  {expanded[proposal.id] ? (
                    <>
                      <p className="text-muted-foreground mb-4">{proposal.abstract}</p>
                      <Link
                        href={`/proposals/${proposal.id}`}
                        className="text-primary hover:underline"
                      >
                        View full proposal details ↗
                      </Link>
                    </>
                  ) : (
                    <p className="text-muted-foreground line-clamp-3">{proposal.abstract}</p>
                  )}
                </div>

                {proposal.userDeliberation && (
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Your Deliberation:</h4>
                    <p className="text-muted-foreground">{proposal.userDeliberation.feedback}</p>
                  </div>
                )}

                {expanded[proposal.id] && proposal.reviewerComments.length > 0 && (
                  <ReviewerComments 
                    comments={proposal.reviewerComments}
                  />
                )}
              </CardContent>

              <CardFooter className="flex justify-between items-center">
                <Button 
                  variant="ghost" 
                  className="gap-2"
                  onClick={() => toggleExpanded(proposal.id)}
                >
                  {expanded[proposal.id] ? (
                    <>
                      See less
                      <ChevronDown className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      See more
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                <div className="flex items-center gap-4">
                  {renderActionButtons(proposal)}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      <DeliberationDialog
        open={dialogProps.open}
        onOpenChange={(open: boolean) => setDialogProps({ ...dialogProps, open })}
        proposalId={dialogProps.proposalId!}
        isReviewer={proposals.find((p: DeliberationProposal) => p.id === dialogProps.proposalId)?.isReviewerEligible ?? false}
        mode={dialogProps.mode!}
        existingVote={dialogProps.existingVote}
        onSubmit={handleSubmit}
      />
    </div>
  )
} 
