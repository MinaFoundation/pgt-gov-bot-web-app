import { PrismaClient, Prisma } from "@prisma/client";
import type { User, ReviewerGroup, ReviewerGroupMember } from "@prisma/client";

export class AdminService {
  constructor(private prisma: PrismaClient) {}

  async checkAdminStatus(userId: string, linkId: string): Promise<boolean> {
    const adminUser = await this.prisma.adminUser.findFirst({
      where: {
        OR: [
          { userId },
          {
            user: {
              linkId,
            },
          },
        ],
      },
    });
    return !!adminUser;
  }

  async getReviewerGroups() {
    return this.prisma.reviewerGroup.findMany({
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                metadata: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            metadata: true,
          },
        },
      },
    });
  }

  async createReviewerGroup(
    name: string,
    description: string,
    createdById: string
  ): Promise<ReviewerGroup> {
    return this.prisma.reviewerGroup.create({
      data: {
        name,
        description,
        createdBy: {
          connect: { id: createdById },
        },
      },
      include: {
        createdBy: {
          select: {
            id: true,
            metadata: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                metadata: true,
              },
            },
          },
        },
      },
    });
  }

  async updateReviewerGroup(
    id: string,
    data: Prisma.ReviewerGroupUpdateInput
  ): Promise<ReviewerGroup> {
    return this.prisma.reviewerGroup.update({
      where: { id },
      data,
      include: {
        createdBy: {
          select: {
            id: true,
            metadata: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                metadata: true,
              },
            },
          },
        },
      },
    });
  }

  async deleteReviewerGroup(id: string): Promise<ReviewerGroup> {
    // First delete all members to maintain referential integrity
    await this.prisma.reviewerGroupMember.deleteMany({
      where: {
        reviewerGroup: {
          id,
        },
      },
    });

    return this.prisma.reviewerGroup.delete({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            metadata: true,
          },
        },
      },
    });
  }

  async addMemberToGroup(
    groupId: string,
    userId: string
  ): Promise<ReviewerGroupMember> {
    return this.prisma.reviewerGroupMember.create({
      data: {
        reviewerGroup: {
          connect: { id: groupId },
        },
        user: {
          connect: { id: userId },
        },
      },
      include: {
        reviewerGroup: {
          include: {
            createdBy: {
              select: {
                id: true,
                metadata: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            metadata: true,
          },
        },
      },
    });
  }

  async removeMemberFromGroup(
    groupId: string,
    userId: string
  ): Promise<ReviewerGroupMember> {
    return this.prisma.reviewerGroupMember.delete({
      where: {
        reviewerGroupId_userId: {
          reviewerGroupId: groupId,
          userId: userId,
        },
      },
      include: {
        reviewerGroup: {
          include: {
            createdBy: {
              select: {
                id: true,
                metadata: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            metadata: true,
          },
        },
      },
    });
  }

  async getReviewerGroupById(id: string): Promise<ReviewerGroup | null> {
    return this.prisma.reviewerGroup.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                metadata: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            metadata: true,
          },
        },
      },
    });
  }

  async updateReviewerGroupWithMembers(
    id: string,
    data: { name: string; description: string },
    memberIds: string[]
  ): Promise<ReviewerGroup> {
    // First, delete all existing members
    await this.prisma.reviewerGroupMember.deleteMany({
      where: {
        reviewerGroupId: id,
      },
    });

    // Then update the group and create new members
    return this.prisma.reviewerGroup.update({
      where: { id },
      data: {
        ...data,
        members: {
          create: memberIds.map((userId) => ({
            user: {
              connect: { id: userId },
            },
          })),
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                metadata: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            metadata: true,
          },
        },
      },
    });
  }

  async getTopics() {
    return this.prisma.topic.findMany({
      include: {
        reviewerGroups: {
          include: {
            reviewerGroup: true,
          },
        },
        fundingRounds: true,
        createdBy: {
          select: {
            id: true,
            metadata: true,
          },
        },
      },
    });
  }

  async getTopicById(id: string) {
    return this.prisma.topic.findUnique({
      where: { id },
      include: {
        reviewerGroups: {
          include: {
            reviewerGroup: true,
          },
        },
        fundingRounds: true,
        createdBy: {
          select: {
            id: true,
            metadata: true,
          },
        },
      },
    });
  }

  async createTopic(
    name: string,
    description: string,
    createdById: string,
    reviewerGroupIds: string[]
  ) {
    return this.prisma.topic.create({
      data: {
        name,
        description,
        createdBy: {
          connect: { id: createdById },
        },
        reviewerGroups: {
          create: reviewerGroupIds.map((reviewerGroupId) => ({
            reviewerGroup: {
              connect: { id: reviewerGroupId },
            },
          })),
        },
      },
      include: {
        reviewerGroups: {
          include: {
            reviewerGroup: true,
          },
        },
        fundingRounds: true,
        createdBy: {
          select: {
            id: true,
            metadata: true,
          },
        },
      },
    });
  }

  async updateTopicWithReviewerGroups(
    id: string,
    data: { name: string; description: string },
    reviewerGroupIds: string[]
  ) {
    // First, delete all existing reviewer group associations
    await this.prisma.topicReviewerGroup.deleteMany({
      where: {
        topicId: id,
      },
    });

    // Then update the topic and create new reviewer group associations
    return this.prisma.topic.update({
      where: { id },
      data: {
        ...data,
        reviewerGroups: {
          create: reviewerGroupIds.map((reviewerGroupId) => ({
            reviewerGroup: {
              connect: { id: reviewerGroupId },
            },
          })),
        },
      },
      include: {
        reviewerGroups: {
          include: {
            reviewerGroup: true,
          },
        },
        fundingRounds: true,
        createdBy: {
          select: {
            id: true,
            metadata: true,
          },
        },
      },
    });
  }

  async deleteTopic(id: string) {
    // First delete all reviewer group associations
    await this.prisma.topicReviewerGroup.deleteMany({
      where: {
        topicId: id,
      },
    });

    return this.prisma.topic.delete({
      where: { id },
    });
  }

  async getFundingRounds() {
    return this.prisma.fundingRound.findMany({
      include: {
        topic: {
          include: {
            reviewerGroups: {
              include: {
                reviewerGroup: true,
              },
            },
          },
        },
        considerationPhase: true,
        deliberationPhase: true,
        votingPhase: true,
        createdBy: {
          select: {
            id: true,
            metadata: true,
          },
        },
      },
    });
  }

  async getFundingRoundById(id: string) {
    return this.prisma.fundingRound.findUnique({
      where: { id },
      include: {
        topic: {
          include: {
            reviewerGroups: {
              include: {
                reviewerGroup: true,
              },
            },
          },
        },
        considerationPhase: true,
        deliberationPhase: true,
        votingPhase: true,
        createdBy: {
          select: {
            id: true,
            metadata: true,
          },
        },
      },
    });
  }

  async createFundingRound(data: {
    name: string;
    description: string;
    topicId: string;
    totalBudget: number;
    createdById: string;
    fundingRoundDates: { from: Date; to: Date };
    considerationDates: { from: Date; to: Date };
    deliberationDates: { from: Date; to: Date };
    votingDates: { from: Date; to: Date };
  }) {
    // Use a transaction to ensure all phases are created atomically
    return this.prisma.$transaction(async (tx) => {
      // Create the funding round with proper createdById
      const fundingRound = await tx.fundingRound.create({
        data: {
          name: data.name,
          description: data.description,
          topic: {
            connect: { id: data.topicId },
          },
          createdBy: {
            connect: { id: data.createdById },
          },
          totalBudget: data.totalBudget,
          startDate: data.fundingRoundDates.from,
          endDate: data.fundingRoundDates.to,
          status: "DRAFT",
        },
      });

      // Create all phases
      await tx.considerationPhase.create({
        data: {
          fundingRound: { connect: { id: fundingRound.id } },
          startDate: data.considerationDates.from,
          endDate: data.considerationDates.to,
        },
      });

      await tx.deliberationPhase.create({
        data: {
          fundingRound: { connect: { id: fundingRound.id } },
          startDate: data.deliberationDates.from,
          endDate: data.deliberationDates.to,
        },
      });

      await tx.votingPhase.create({
        data: {
          fundingRound: { connect: { id: fundingRound.id } },
          startDate: data.votingDates.from,
          endDate: data.votingDates.to,
        },
      });

      // Return the complete funding round with all relations
      return tx.fundingRound.findUnique({
        where: { id: fundingRound.id },
        include: {
          topic: {
            include: {
              reviewerGroups: {
                include: {
                  reviewerGroup: true,
                },
              },
            },
          },
          considerationPhase: true,
          deliberationPhase: true,
          votingPhase: true,
          createdBy: {
            select: {
              id: true,
              metadata: true,
            },
          },
        },
      });
    });
  }

  async updateFundingRound(
    id: string,
    data: {
      name: string;
      description: string;
      topicId: string;
      totalBudget: number;
      fundingRoundDates: { from: Date; to: Date };
      considerationDates: { from: Date; to: Date };
      deliberationDates: { from: Date; to: Date };
      votingDates: { from: Date; to: Date };
    }
  ) {
    // Use a transaction to ensure all updates are atomic
    return this.prisma.$transaction(async (tx) => {
      // Update the funding round
      const fundingRound = await tx.fundingRound.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          topic: {
            connect: { id: data.topicId },
          },
          totalBudget: data.totalBudget,
          startDate: data.fundingRoundDates.from,
          endDate: data.fundingRoundDates.to,
        },
      });

      // Update all phases
      await tx.considerationPhase.update({
        where: { fundingRoundId: id },
        data: {
          startDate: data.considerationDates.from,
          endDate: data.considerationDates.to,
        },
      });

      await tx.deliberationPhase.update({
        where: { fundingRoundId: id },
        data: {
          startDate: data.deliberationDates.from,
          endDate: data.deliberationDates.to,
        },
      });

      await tx.votingPhase.update({
        where: { fundingRoundId: id },
        data: {
          startDate: data.votingDates.from,
          endDate: data.votingDates.to,
        },
      });

      // Return the complete updated funding round
      return tx.fundingRound.findUnique({
        where: { id: fundingRound.id },
        include: {
          topic: {
            include: {
              reviewerGroups: {
                include: {
                  reviewerGroup: true,
                },
              },
            },
          },
          considerationPhase: true,
          deliberationPhase: true,
          votingPhase: true,
          createdBy: {
            select: {
              id: true,
              metadata: true,
            },
          },
        },
      });
    });
  }

  async deleteFundingRound(id: string) {
    // Use a transaction to ensure all related data is deleted
    return this.prisma.$transaction(async (tx) => {
      // Delete all phases
      await tx.considerationPhase.delete({
        where: { fundingRoundId: id },
      });
      await tx.deliberationPhase.delete({
        where: { fundingRoundId: id },
      });
      await tx.votingPhase.delete({
        where: { fundingRoundId: id },
      });

      // Finally delete the funding round
      return tx.fundingRound.delete({
        where: { id },
      });
    });
  }
}