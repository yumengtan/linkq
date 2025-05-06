// Copyright (c) 2024 Massachusetts Institute of Technology
// SPDX-License-Identifier: MIT

import { useMemo, useRef } from "react";
import Graphin, { Components, LegendChildrenProps } from "@antv/graphin";
import { ActionIcon, Title } from '@mantine/core';
import { useAppSelector } from "redux/store.ts";
import { IconFocus } from "@tabler/icons-react";
import styles from "./QueryGraph.module.scss";

import { parseCypherQuery } from "utils/neo4j/parseCypherQuery";
import { transformCypherToGraphin } from "utils/neo4j/transformCyphertoGraphin";

const { Legend } = Components;

export function QueryGraph() {
    const graphRef = useRef<Graphin>(null);
    const query = useAppSelector((state) => state.queryValue); 
    
    const graphData = useMemo(() => {
      if (!query) return { nodes: [], edges: [] };
      
      try {
        // Parse the Cypher query to extract nodes and relationships
        const { nodes, relationships } = parseCypherQuery(query.value);
        
        // Transform the nodes and relationships to Graphin format
        return transformCypherToGraphin(nodes, relationships);
      } catch (error) {
        console.error("Error parsing query for visualization:", error);
        return { nodes: [], edges: [] };
      }
    }, [query]);
    
    const center = () => {
      if (graphRef.current) {
        const graph = graphRef.current.graph;
        graph.fitView(); // Re-centers and fits graph to view
      }
    };
    
    // If there are no nodes to display, return null
    if (graphData.nodes.length === 0) return null;
    
    return (
      <div>
        <Title style={{color:"white", marginLeft: 13, marginBottom: 7, marginTop: 7, padding: 1}} order={4}>
          Query Structure Graph
        </Title>
        <div id={styles["graph-container"]}>
          <Graphin 
            ref={graphRef}
            data={graphData}
            layout={{ 
              type: 'dagre',
              rankdir: 'LR'
            }}
            style={{minHeight: "unset"}}
            theme={{ mode: 'dark' }}
          >
            <Legend bindType="node" sortKey="data.type">
              {(renderProps: LegendChildrenProps) => {
                return <Legend.Node {...renderProps} />;
              }}
            </Legend>
          </Graphin>
          <ActionIcon 
            className={styles["recenter-button"]} 
            size="sm"
            variant="filled" 
            aria-label="Center"
            onClick={() => center()}
          >
            <IconFocus size={18} />
          </ActionIcon>
        </div>
      </div>
    );
  }