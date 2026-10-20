"""Neural-network architecture definitions used by PapLens."""

import torch
import torch.nn as nn
import torch.nn.functional as F


class AttentionMIL(nn.Module):
    """Gated Attention Deep MIL aggregator from the research evaluation."""

    def __init__(self, feature_dim: int = 2048, num_classes: int = 2):
        super().__init__()
        self.L = 512
        self.D = 128
        self.K = 1

        self.feature_extractor_part2 = nn.Sequential(
            nn.Linear(feature_dim, self.L),
            nn.ReLU(),
            nn.Dropout(0.2),
        )
        self.attention_V = nn.Sequential(nn.Linear(self.L, self.D), nn.Tanh())
        self.attention_U = nn.Sequential(nn.Linear(self.L, self.D), nn.Sigmoid())
        self.attention_weights = nn.Linear(self.D, self.K)
        self.classifier = nn.Sequential(nn.Linear(self.L * self.K, num_classes))

    def forward(self, x: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        """Return slide logits and normalized instance-attention weights."""
        if x.dim() == 3:
            x = x.squeeze(0)
        x = x.view(x.size(0), -1)
        features = self.feature_extractor_part2(x)
        attention_v = self.attention_V(features)
        attention_u = self.attention_U(features)
        attention = self.attention_weights(attention_v * attention_u)
        attention = torch.transpose(attention, 1, 0)
        attention = F.softmax(attention, dim=1)
        pooled_features = torch.mm(attention, features)
        logits = self.classifier(pooled_features)
        return logits, attention
