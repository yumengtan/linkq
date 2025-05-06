// Copyright (c) 2024 Massachusetts Institute of Technology
// SPDX-License-Identifier: MIT

import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Table, Title } from "@mantine/core";
import { InfoModal } from "components/InfoModal";
import { useAppSelector } from "redux/store";
import { useEffect, useState } from "react";
import styles from "./IDTable.module.scss";

// Define IDTableEntitiesType here if it can't be found:
export type IDTableEntitiesType = {
  id: string;
  label: string;
  description?: string;
  properties?: Record<string, any>;
};

export function IDTableContainer() {
  const [nodeProperties, setNodeProperties] = useState<IDTableEntitiesType[]>([]);
  // Fix property access - make sure this matches your state structure
  const query = useAppSelector((state) => state.queryValue.value || "");
  const isConnected = useAppSelector((state) => state.neo4jConnection.connected);

  useEffect(() => {
    const extractNodesFromQuery = async () => {
      if (!query || !isConnected) {
        setNodeProperties([]);
        return;
      }

      try {
        // Extract node labels and ids from the query using a pattern matching approach
        const nodePattern = /\b([a-zA-Z_]\w*):([a-zA-Z_]\w*)\b/g;
        const matches = [...query.matchAll(nodePattern)];
        
        if (matches.length === 0) return;

        // Get unique node variables
        const nodeVariables = Array.from(new Set(matches.map(match => match[1])));
        
        // Get properties for each node
        const nodesWithProperties: IDTableEntitiesType[] = [];
        
        for (const nodeVar of nodeVariables) {
          const nodeLabels = matches
            .filter(match => match[1] === nodeVar)
            .map(match => match[2]);
          
          if (nodeLabels.length > 0) {
            nodesWithProperties.push({
              id: nodeVar,
              label: nodeLabels.join(':'),
              description: `Node variable: ${nodeVar}`
            });
          }
        }
        
        setNodeProperties(nodesWithProperties);
      } catch (error) {
        console.error("Error extracting nodes from query:", error);
        setNodeProperties([]);
      }
    };

    extractNodesFromQuery();
  }, [query, isConnected]);

  // Use the NodeTable component to display the extracted nodes
  return (
    <div id={styles["id-table-container"]}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <Title order={3} size="h6">Node Variables</Title>
        <InfoModal title="Node Variables">
          <p>
            This table shows the node variables used in your Cypher query.
            Each row represents a variable in your query with its associated label.
          </p>
        </InfoModal>
      </div>
      
      <NodeTable data={nodeProperties} />
    </div>
  );
}

// Create a separate NodeTable component
function NodeTable({data}: {data: IDTableEntitiesType[]}) {
  const columnHelper = createColumnHelper<IDTableEntitiesType>();
  
  const columns = [
    columnHelper.accessor('id', {
      header: 'ID',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('label', {
      header: 'Label',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('description', {
      header: 'Description',
      cell: info => info.getValue() || '',
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      {data.length > 0 ? (
        <Table>
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <p>No node variables detected in the current query.</p>
      )}
    </>
  );
}