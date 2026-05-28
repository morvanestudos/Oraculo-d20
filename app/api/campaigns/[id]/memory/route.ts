import { NextResponse } from 'next/server'
import prisma from '../../../../../lib/prisma'
import type { CampaignMemory, CampaignMemoryUpdateDTO } from '../../../../../lib/types'

function mapCampaignMemory(raw: any): CampaignMemory {
  return {
    id: String(raw.id),
    campaignId: String(raw.campaignId),
    currentScene: raw.currentScene || '',
    currentLocation: raw.currentLocation || '',
    currentObjective: raw.currentObjective || '',
    currentThreat: raw.currentThreat || '',
    tensionLevel: raw.tensionLevel || 1,
    discoveredClues: Array.isArray(raw.discoveredClues) ? raw.discoveredClues : [],
    activeNPCs: Array.isArray(raw.activeNPCs) ? raw.activeNPCs : [],
    activeEnemies: Array.isArray(raw.activeEnemies) ? raw.activeEnemies : [],
    storyFlags: typeof raw.storyFlags === 'object' ? raw.storyFlags : {},
    turnCount: raw.turnCount || 0,
    lastPlayerAction: raw.lastPlayerAction || '',
    lastMasterAction: raw.lastMasterAction || '',
    summary: raw.summary || null,
    lastSummaryTurn: raw.lastSummaryTurn || 0,
    updatedAt: raw.updatedAt?.toISOString() || new Date().toISOString(),
    createdAt: raw.createdAt?.toISOString() || new Date().toISOString()
  }
}

// GET: Retrieve campaign memory
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const campaignId = parseInt(params.id)
    if (isNaN(campaignId)) {
      return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 })
    }

    const memory = await prisma.campaignMemory.findUnique({
      where: { campaignId }
    })

    if (!memory) {
      // Create initial memory if it doesn't exist
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId }
      })

      if (!campaign) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
      }

      const newMemory = await prisma.campaignMemory.create({
        data: {
          campaignId,
          currentScene: 'início da aventura',
          currentLocation: `os arredores da campanha ${campaign.title}`,
          currentObjective: 'explorar e descobrir',
          currentThreat: 'desconhecido',
          tensionLevel: 1,
          turnCount: 0
        }
      })

      return NextResponse.json(mapCampaignMemory(newMemory))
    }

    return NextResponse.json(mapCampaignMemory(memory))
  } catch (error) {
    console.error('Error retrieving campaign memory:', error)
    return NextResponse.json({ error: 'Failed to retrieve memory' }, { status: 500 })
  }
}

// POST: Create or initialize campaign memory
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const campaignId = parseInt(params.id)
    if (isNaN(campaignId)) {
      return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 })
    }

    const body = await request.json() as CampaignMemoryUpdateDTO

    // Check if campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId }
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Delete existing memory if it exists
    await prisma.campaignMemory.deleteMany({
      where: { campaignId }
    })

    // Create new memory
    const memory = await prisma.campaignMemory.create({
      data: {
        campaignId,
        currentScene: body.currentScene || 'início da aventura',
        currentLocation: body.currentLocation || `os arredores da campanha ${campaign.title}`,
        currentObjective: body.currentObjective || 'explorar e descobrir',
        currentThreat: body.currentThreat || 'desconhecido',
        tensionLevel: body.tensionLevel || 1,
        discoveredClues: body.discoveredClues || [],
        activeNPCs: body.activeNPCs || [],
        activeEnemies: body.activeEnemies || [],
        storyFlags: body.storyFlags || {},
        turnCount: body.turnCount || 0,
        lastPlayerAction: body.lastPlayerAction || '',
        lastMasterAction: body.lastMasterAction || '',
        summary: body.summary || null
      }
    })

    return NextResponse.json(mapCampaignMemory(memory), { status: 201 })
  } catch (error) {
    console.error('Error creating campaign memory:', error)
    return NextResponse.json({ error: 'Failed to create memory' }, { status: 500 })
  }
}

// PATCH: Update campaign memory
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const campaignId = parseInt(params.id)
    if (isNaN(campaignId)) {
      return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 })
    }

    const body = await request.json() as CampaignMemoryUpdateDTO

    // Ensure memory exists
    let memory = await prisma.campaignMemory.findUnique({
      where: { campaignId }
    })

    if (!memory) {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId }
      })

      if (!campaign) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
      }

      memory = await prisma.campaignMemory.create({
        data: {
          campaignId,
          currentScene: body.currentScene || 'início da aventura',
          currentLocation: body.currentLocation || `os arredores da campanha ${campaign.title}`,
          currentObjective: body.currentObjective || 'explorar e descobrir',
          currentThreat: body.currentThreat || 'desconhecido',
          tensionLevel: body.tensionLevel || 1,
          discoveredClues: body.discoveredClues || [],
          activeNPCs: body.activeNPCs || [],
          activeEnemies: body.activeEnemies || [],
          storyFlags: body.storyFlags || {},
          turnCount: body.turnCount || 0,
          lastPlayerAction: body.lastPlayerAction || '',
          lastMasterAction: body.lastMasterAction || ''
        }
      })
    }

    // Build update data
    const updateData: any = {}
    if (body.currentScene !== undefined) updateData.currentScene = body.currentScene
    if (body.currentLocation !== undefined) updateData.currentLocation = body.currentLocation
    if (body.currentObjective !== undefined) updateData.currentObjective = body.currentObjective
    if (body.currentThreat !== undefined) updateData.currentThreat = body.currentThreat
    if (body.tensionLevel !== undefined) updateData.tensionLevel = body.tensionLevel
    if (body.discoveredClues !== undefined) updateData.discoveredClues = body.discoveredClues
    if (body.activeNPCs !== undefined) updateData.activeNPCs = body.activeNPCs
    if (body.activeEnemies !== undefined) updateData.activeEnemies = body.activeEnemies
    if (body.storyFlags !== undefined) updateData.storyFlags = body.storyFlags
    if (body.turnCount !== undefined) updateData.turnCount = body.turnCount
    if (body.lastPlayerAction !== undefined) updateData.lastPlayerAction = body.lastPlayerAction
    if (body.lastMasterAction !== undefined) updateData.lastMasterAction = body.lastMasterAction
    if (body.summary !== undefined) updateData.summary = body.summary
    if (body.lastSummaryTurn !== undefined) updateData.lastSummaryTurn = body.lastSummaryTurn

    const updatedMemory = await prisma.campaignMemory.update({
      where: { campaignId },
      data: updateData
    })

    return NextResponse.json(mapCampaignMemory(updatedMemory))
  } catch (error) {
    console.error('Error updating campaign memory:', error)
    return NextResponse.json({ error: 'Failed to update memory' }, { status: 500 })
  }
}
