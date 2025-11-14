from app.models.base import Base  # noqa: F401
# import models here so Alembic (later) sees them
from app.models.user import User  # noqa: F401
from app.models.user_integration import UserIntegration  # noqa: F401
from app.models.email_verification import EmailVerificationToken  # noqa: F401
from app.models.project import Project  # noqa: F401
from app.models.file import File  # noqa: F401
from app.models.job import Job  # noqa: F401
from app.models.job_event import JobEvent  # noqa: F401
from app.models.boq_item import BoqItem  # noqa: F401
from app.models.price_list import PriceList  # noqa: F401
from app.models.price_item import PriceItem  # noqa: F401
from app.models.artifact import Artifact  # noqa: F401
from app.models.mapping import DwgLayerMap, IfcClassMap  # noqa: F401
from app.models.access_request import AccessRequest  # noqa: F401
from app.models.supplier import Supplier, SupplierPriceItem  # noqa: F401
from app.models.template import Template, TemplateItem  # noqa: F401
from app.models.estimate import Estimate, EstimateItem, CostAdjustment  # noqa: F401

# Collaboration & PM models
from app.modules.collaboration.models import (  # noqa: F401
    ProjectCollaborator,
    ProjectInvitation,
    Comment,
    Activity,
    Notification
)
from app.modules.tasks.models import (  # noqa: F401
    Task,
    TaskRevision,
    TaskDependency,
    TaskAttachment
)
