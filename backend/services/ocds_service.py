from models.ocds import OCDSRelease, OCDSReleasePackage


def get_sample_ocds_data() -> OCDSReleasePackage:
    """Données OCDS de démonstration utilisées si Supabase n'est pas configuré."""
    return OCDSReleasePackage(
        uri="https://nazaha-graph.local/ocds/sample",
        publishedDate="2024-01-15",
        releases=[
            OCDSRelease(
                ocid="ocds-nazaha-001",
                id="release-001",
                date="2024-01-15",
                tag=["tender"],
                parties=[
                    {"id": "buyer-1", "name": "Direction des Achats Publics", "roles": ["buyer"]},
                    {"id": "company-a", "name": "Entreprise A SARL", "roles": ["tenderer"]},
                    {"id": "company-b", "name": "Entreprise B SA", "roles": ["tenderer"]},
                    {"id": "company-c", "name": "Entreprise C SNC", "roles": ["tenderer"]},
                    {"id": "director-x", "name": "Directeur X", "roles": ["procuringEntity"]},
                    {"id": "supplier-common", "name": "Fournisseur Commun", "roles": ["supplier"]},
                ],
                tender={"id": "tender-1", "title": "Marché infrastructure routière", "status": "complete"},
                awards=[
                    {
                        "id": "award-1",
                        "title": "Attribution infrastructure",
                        "status": "active",
                        "value": {"amount": 2500000, "currency": "MAD"},
                        "suppliers": [{"id": "company-a", "name": "Entreprise A SARL"}],
                    }
                ],
                contracts=[
                    {
                        "id": "CONT-2024-001",
                        "awardID": "award-1",
                        "title": "Contrat infrastructure routière",
                        "status": "active",
                        "value": {"amount": 2500000, "currency": "MAD"},
                        "dateSigned": "2024-01-15",
                    }
                ],
            ),
            OCDSRelease(
                ocid="ocds-nazaha-002",
                id="release-002",
                date="2024-01-14",
                tag=["tender"],
                parties=[
                    {"id": "buyer-2", "name": "Ministère de la Santé", "roles": ["buyer"]},
                    {"id": "company-a", "name": "Entreprise A SARL", "roles": ["tenderer"]},
                    {"id": "company-b", "name": "Entreprise B SA", "roles": ["tenderer"]},
                    {"id": "company-c", "name": "Entreprise C SNC", "roles": ["tenderer"]},
                    {"id": "director-x", "name": "Directeur X", "roles": ["procuringEntity"]},
                    {"id": "supplier-common", "name": "Fournisseur Commun", "roles": ["supplier"]},
                ],
                tender={"id": "tender-6", "title": "Fournitures de bureau et papeterie", "status": "complete"},
                awards=[
                    {
                        "id": "award-2",
                        "title": "Soumission rejetée - papeterie",
                        "status": "unsuccessful",
                        "value": {"amount": 450000, "currency": "MAD"},
                        "suppliers": [{"id": "company-b", "name": "Entreprise B SA"}],
                    }
                ],
                contracts=[
                    {
                        "id": "CONT-2024-002",
                        "awardID": "award-2",
                        "title": "Contrat services informatiques",
                        "status": "cancelled",
                        "value": {"amount": 450000, "currency": "MAD"},
                        "dateSigned": "2024-01-14",
                    }
                ],
            ),
            OCDSRelease(
                ocid="ocds-nazaha-003",
                id="release-003",
                date="2024-01-12",
                tag=["tender"],
                parties=[
                    {"id": "buyer-1", "name": "Direction des Achats Publics", "roles": ["buyer"]},
                    {"id": "company-d", "name": "Entreprise D", "roles": ["tenderer", "supplier"]},
                    {"id": "director-y", "name": "Directeur Y", "roles": ["procuringEntity"]},
                ],
                tender={"id": "tender-2", "title": "Fournitures médicales", "status": "complete"},
                awards=[
                    {
                        "id": "award-3",
                        "title": "Attribution fournitures",
                        "status": "active",
                        "value": {"amount": 1200000, "currency": "MAD"},
                        "suppliers": [{"id": "company-d", "name": "Entreprise D"}],
                    }
                ],
                contracts=[
                    {
                        "id": "CONT-2024-003",
                        "awardID": "award-3",
                        "title": "Contrat fournitures médicales",
                        "status": "active",
                        "value": {"amount": 1200000, "currency": "MAD"},
                        "dateSigned": "2024-01-12",
                    }
                ],
            ),
            OCDSRelease(
                ocid="ocds-nazaha-004",
                id="release-004",
                date="2024-01-10",
                tag=["tender"],
                parties=[
                    {"id": "buyer-1", "name": "Direction des Achats Publics", "roles": ["buyer"]},
                    {"id": "company-e", "name": "Entreprise E", "roles": ["tenderer"]},
                ],
                tender={"id": "tender-3", "title": "Maintenance bâtiments", "status": "complete"},
                awards=[
                    {
                        "id": "award-4",
                        "title": "Attribution maintenance",
                        "status": "active",
                        "value": {"amount": 750000, "currency": "MAD"},
                        "suppliers": [{"id": "company-e", "name": "Entreprise E"}],
                    }
                ],
                contracts=[
                    {
                        "id": "CONT-2024-004",
                        "awardID": "award-4",
                        "title": "Contrat maintenance",
                        "status": "active",
                        "value": {"amount": 750000, "currency": "MAD"},
                        "dateSigned": "2024-01-10",
                    }
                ],
            ),
            OCDSRelease(
                ocid="ocds-nazaha-005",
                id="release-005",
                date="2024-01-08",
                tag=["tender"],
                parties=[
                    {"id": "buyer-1", "name": "Direction des Achats Publics", "roles": ["buyer"]},
                    {"id": "company-c", "name": "Entreprise C SNC", "roles": ["tenderer"]},
                    {"id": "supplier-common", "name": "Fournisseur Commun", "roles": ["supplier"]},
                ],
                tender={"id": "tender-4", "title": "Équipements lourds", "status": "complete"},
                awards=[
                    {
                        "id": "award-5",
                        "title": "Attribution rejetée",
                        "status": "cancelled",
                        "value": {"amount": 3100000, "currency": "MAD"},
                        "suppliers": [{"id": "company-c", "name": "Entreprise C SNC"}],
                    }
                ],
                contracts=[
                    {
                        "id": "CONT-2024-005",
                        "awardID": "award-5",
                        "title": "Contrat équipements lourds",
                        "status": "terminated",
                        "value": {"amount": 3100000, "currency": "MAD"},
                        "dateSigned": "2024-01-08",
                    }
                ],
            ),
            OCDSRelease(
                ocid="ocds-nazaha-006",
                id="release-006",
                date="2024-01-05",
                tag=["tender"],
                parties=[
                    {"id": "buyer-1", "name": "Direction des Achats Publics", "roles": ["buyer"]},
                    {"id": "company-a", "name": "Entreprise A SARL", "roles": ["tenderer"]},
                    {"id": "company-b", "name": "Entreprise B SA", "roles": ["tenderer"]},
                    {"id": "supplier-common", "name": "Fournisseur Commun", "roles": ["supplier"]},
                ],
                tender={"id": "tender-5", "title": "Sous-traitance logistique", "status": "complete"},
                awards=[
                    {
                        "id": "award-6",
                        "title": "Attribution logistique",
                        "status": "active",
                        "value": {"amount": 325000, "currency": "MAD"},
                        "suppliers": [{"id": "company-a", "name": "Entreprise A SARL"}],
                    }
                ],
                contracts=[
                    {
                        "id": "CONT-2024-006",
                        "awardID": "award-6",
                        "title": "Contrat logistique",
                        "status": "active",
                        "value": {"amount": 325000, "currency": "MAD"},
                        "dateSigned": "2024-01-05",
                    }
                ],
            ),
        ],
    )
