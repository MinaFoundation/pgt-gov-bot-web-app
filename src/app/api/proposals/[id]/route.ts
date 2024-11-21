import { NextResponse } from "next/server";
import { ProposalService } from "@/services/ProposalService";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { ZodError } from "zod";

const proposalService = new ProposalService(prisma);

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const proposal = await prisma.proposal.findUnique({
      where: { id: (await context.params).id },
      include: {
        user: {
          select: {
            metadata: true,
          },
        },
        fundingRound: {
          include: {
            considerationPhase: true,
            deliberationPhase: true,
            votingPhase: true,
          },
        },
      },
    });

    if (!proposal) {
      return NextResponse.json(
        { error: "Proposal not found" },
        { status: 404 }
      );
    }

    // Add access control flags
    const response = {
      ...proposal,
      canEdit: proposal.userId === user.id && proposal.status === "DRAFT",
      canDelete: proposal.userId === user.id && proposal.status === "DRAFT",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to fetch proposal:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: "Please log in to delete proposals" },
        { status: 401 }
      );
    }

    await proposalService.deleteProposal((await params).id, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete proposal:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: "Please log in to update proposals" },
        { status: 401 }
      );
    }

    const data = await req.json();

    // Verify user can edit this proposal
    const existing = await proposalService.getProposalById(
      (
        await params
      ).id,
      user.id,
      user.linkId
    );

    if (!existing) {
      return NextResponse.json(
        { error: "Proposal not found" },
        { status: 404 }
      );
    }

    if (!existing.canEdit) {
      return NextResponse.json(
        { error: "You cannot edit this proposal" },
        { status: 403 }
      );
    }

    // Update proposal
    const updated = await proposalService.updateProposal(
      (
        await params
      ).id,
      data
    );

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update proposal:", error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
