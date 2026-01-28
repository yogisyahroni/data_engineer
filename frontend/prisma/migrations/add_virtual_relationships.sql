model VirtualRelationship { id String @id @default(cuid()) connectionId String connection DatabaseConnection @relation(
    fields: [connectionId],
    references: [id],
    onDelete: Cascade
) fromTable String fromColumn String toTable String toColumn String type RelationshipType userId String user User @relation(
    fields: [userId],
    references: [id],
    onDelete: Cascade
) createdAt DateTime @default(now()) updatedAt DateTime @updatedAt @@index([connectionId]) @@index([userId]) } enum RelationshipType { ONE_TO_ONE ONE_TO_MANY MANY_TO_MANY }